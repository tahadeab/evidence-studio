import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.fn();
const onDuplicateKeyUpdate = vi.fn();
const updateSet = vi.fn();
const updateWhere = vi.fn();
const insert = vi.fn(() => ({ values: insertValues }));
const update = vi.fn(() => ({ set: updateSet }));
const fakeDb = { insert, update };

vi.mock("../db", () => ({
  getDb: vi.fn(async () => fakeDb),
}));

import { addResearchEvent, addResearchSources, completeResearchTask, createResearchTask, saveStructuredReport } from "./db";

describe("research persistence helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.mockReturnValue({ onDuplicateKeyUpdate });
    updateSet.mockReturnValue({ where: updateWhere });
  });

  it("persists a running task, its workflow event, and normalized source score", async () => {
    await createResearchTask({ id: "research-123", userId: 7, title: "Question", query: "A detailed research question", provider: "openai", model: "gpt-4.1-mini" });
    await addResearchEvent({ researchId: "research-123", sequence: 1, type: "plan", message: "Plan stored", detail: { subQueries: ["question evidence"] } });
    await addResearchSources("research-123", [{ title: "Source", url: "https://example.org/source", domain: "example.org", sourceType: "record", excerpt: "Evidence", relevanceScore: 0.91 }]);

    expect(insertValues).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "research-123", status: "running", provider: "openai" }));
    expect(insertValues).toHaveBeenNthCalledWith(2, expect.objectContaining({ researchId: "research-123", sequence: 1, type: "plan" }));
    expect(insertValues).toHaveBeenNthCalledWith(3, [expect.objectContaining({ researchId: "research-123", relevanceScore: 91 })]);
  });

  it("stores a validated structured report and completes the research task", async () => {
    const report = {
      executiveSummary: "Evidence-led summary.",
      findings: [{ heading: "Finding", analysis: "Evidence analysis." }],
      sources: [{ title: "Source", url: "https://example.org/source" }],
    };
    await saveStructuredReport("research-123", report, "## executive summary\n\nEvidence-led summary.");
    await completeResearchTask("research-123", "## executive summary\n\nEvidence-led summary.");

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ researchId: "research-123", executiveSummary: report.executiveSummary, markdown: expect.stringContaining("executive summary") }));
    expect(onDuplicateKeyUpdate).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", reportContent: expect.stringContaining("executive summary") }));
    expect(updateWhere).toHaveBeenCalledOnce();
  });
});
