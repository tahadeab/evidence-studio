import { afterEach, describe, expect, it, vi } from "vitest";
import { gatherSources } from "./sources";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("gatherSources", () => {
  it("deduplicates queries and converts Crossref records into cited source records", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          items: [{
            title: ["A research record"],
            DOI: "10.5555/example",
            abstract: "<jats:p>Evidence summary</jats:p>",
            type: "journal-article",
            score: 90,
          }],
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const sources = await gatherSources(["evidence query", "evidence query"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sources).toEqual([expect.objectContaining({
      title: "A research record",
      url: "https://doi.org/10.5555/example",
      excerpt: "Evidence summary",
    })]);
  });
});
