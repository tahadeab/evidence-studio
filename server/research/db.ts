import { and, desc, eq } from "drizzle-orm";
import { providerPreferences, researchEvents, researchReports, researchSources, researchTasks } from "../../drizzle/schema";
import type { ResearchEventDetail, ResearchEventType, ResearchProvider, ResearchStatus, SourceRecord, StructuredReport } from "../../shared/research";
import { getDb } from "../db";

type CreateResearchTask = {
  id: string;
  userId: number;
  title: string;
  query: string;
  provider: ResearchProvider;
  model: string;
};

export async function createResearchTask(input: CreateResearchTask) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(researchTasks).values({ ...input, status: "running" });
}

export async function addResearchEvent(input: {
  researchId: string;
  sequence: number;
  type: ResearchEventType;
  message: string;
  detail?: ResearchEventDetail;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(researchEvents).values({
    ...input,
    detail: input.detail ?? null,
  });
}

export async function addResearchSources(researchId: string, sources: SourceRecord[]) {
  if (sources.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(researchSources).values(
    sources.map(source => ({
      researchId,
      title: source.title.slice(0, 500),
      url: source.url,
      domain: source.domain.slice(0, 255),
      sourceType: source.sourceType.slice(0, 64),
      excerpt: source.excerpt,
      relevanceScore: Math.max(0, Math.min(100, Math.round(source.relevanceScore * 100))),
    })),
  );
}

export async function completeResearchTask(researchId: string, reportContent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db
    .update(researchTasks)
    .set({ status: "completed", reportContent, errorMessage: null, completedAt: new Date() })
    .where(eq(researchTasks.id, researchId));
}

export async function failResearchTask(researchId: string, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db
    .update(researchTasks)
    .set({ status: "failed", errorMessage: errorMessage.slice(0, 2_000), completedAt: new Date() })
    .where(eq(researchTasks.id, researchId));
}

export async function getResearchTask(userId: number, researchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const rows = await db
    .select()
    .from(researchTasks)
    .where(and(eq(researchTasks.id, researchId), eq(researchTasks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getResearchEvents(researchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(researchEvents).where(eq(researchEvents.researchId, researchId)).orderBy(researchEvents.sequence);
}

export async function getResearchSources(researchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(researchSources).where(eq(researchSources.researchId, researchId)).orderBy(desc(researchSources.relevanceScore));
}

export async function listResearchTasks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(researchTasks).where(eq(researchTasks.userId, userId)).orderBy(desc(researchTasks.updatedAt)).limit(40);
}

export async function getProviderPreference(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const rows = await db.select().from(providerPreferences).where(eq(providerPreferences.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function saveProviderPreference(input: { userId: number; provider: ResearchProvider; model: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(providerPreferences).values(input).onDuplicateKeyUpdate({
    set: { provider: input.provider, model: input.model, updatedAt: new Date() },
  });
}

export async function saveStructuredReport(researchId: string, report: StructuredReport, markdown: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(researchReports).values({
    researchId,
    executiveSummary: report.executiveSummary,
    findings: report.findings,
    sources: report.sources,
    markdown,
  }).onDuplicateKeyUpdate({
    set: {
      executiveSummary: report.executiveSummary,
      findings: report.findings,
      sources: report.sources,
      markdown,
      updatedAt: new Date(),
    },
  });
}

export function assertResearchStatus(value: string): asserts value is ResearchStatus {
  if (value !== "running" && value !== "completed" && value !== "failed") {
    throw new Error("Invalid research status.");
  }
}
