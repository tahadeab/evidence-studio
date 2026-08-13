import { describe, expect, it } from "vitest";
import { REPORT_SECTION_NAMES, RESEARCH_STATUSES, reportSchema } from "./research";

describe("research contracts", () => {
  it("uses only the approved status labels", () => {
    expect(RESEARCH_STATUSES).toEqual(["running", "completed", "failed"]);
  });

  it("requires the exact structured report sections", () => {
    expect(REPORT_SECTION_NAMES).toEqual(["executive summary", "findings", "sources"]);
    expect(reportSchema.parse({
      executiveSummary: "A concise evidence-led summary.",
      findings: [{ heading: "Finding one", analysis: "Supported by the retrieved material." }],
      sources: [{ title: "Source one", url: "https://example.org/source" }],
    })).toMatchObject({ executiveSummary: "A concise evidence-led summary." });
  });
});
