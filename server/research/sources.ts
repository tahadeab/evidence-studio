import type { SourceRecord } from "../../shared/research";

type CrossrefWork = {
  title?: string[];
  DOI?: string;
  URL?: string;
  abstract?: string;
  type?: string;
  score?: number;
};

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toCrossrefSource(work: CrossrefWork): SourceRecord | null {
  const title = work.title?.[0]?.trim();
  const url = work.DOI ? `https://doi.org/${work.DOI}` : work.URL;
  if (!title || !url) return null;
  return {
    title,
    url,
    domain: "doi.org",
    sourceType: work.type ?? "scholarly record",
    excerpt: cleanText(work.abstract ?? "No abstract was supplied by this indexed scholarly record.").slice(0, 1_600),
    relevanceScore: Math.min(0.98, Math.max(0.62, (work.score ?? 50) / 100)),
  };
}

async function queryCrossref(query: string) {
  const response = await fetch(`https://api.crossref.org/works?rows=4&query.bibliographic=${encodeURIComponent(query)}`, {
    headers: { "user-agent": "ResearchStudio/1.0 (evidence-led research application)" },
  });
  if (!response.ok) throw new Error(`Crossref returned HTTP ${response.status}`);
  const payload = await response.json() as { message?: { items?: CrossrefWork[] } };
  return (payload.message?.items ?? []).map(toCrossrefSource).filter((source): source is SourceRecord => Boolean(source));
}

export async function gatherSources(queries: string[]): Promise<SourceRecord[]> {
  const distinctQueries = Array.from(new Set(queries.map(query => query.trim()).filter(Boolean))).slice(0, 4);
  const results = await Promise.allSettled(distinctQueries.map(queryCrossref));
  const seen = new Set<string>();
  const sources: SourceRecord[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const source of result.value) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push(source);
    }
  }
  if (sources.length === 0) {
    throw new Error("No scholarly source records were retrieved. Please retry with a more specific topic.");
  }
  return sources.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 8);
}
