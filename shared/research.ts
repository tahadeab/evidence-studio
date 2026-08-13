import { z } from "zod";

export const RESEARCH_PROVIDERS = ["openai", "anthropic", "gemini", "groq"] as const;
export const RESEARCH_STATUSES = ["running", "completed", "failed"] as const;
export const REPORT_SECTION_NAMES = ["executive summary", "findings", "sources"] as const;

export type ResearchProvider = (typeof RESEARCH_PROVIDERS)[number];
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const providerConfigSchema = z.object({
  provider: z.enum(RESEARCH_PROVIDERS),
  model: z.string().trim().min(1).max(160),
  apiKey: z.string().trim().min(8).max(600).optional(),
});

export const createResearchSchema = z.object({
  query: z.string().trim().min(12, "Enter a research question with at least 12 characters.").max(2_000),
  title: z.string().trim().min(3).max(240).optional(),
  providerConfig: providerConfigSchema,
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type CreateResearchInput = z.infer<typeof createResearchSchema>;

export const reportSchema = z.object({
  executiveSummary: z.string().trim().min(1),
  findings: z.array(z.object({
    heading: z.string().trim().min(1),
    analysis: z.string().trim().min(1),
  })).min(1),
  sources: z.array(z.object({
    title: z.string().trim().min(1),
    url: z.string().url(),
  })).min(1),
});

export type StructuredReport = z.infer<typeof reportSchema>;

export type ResearchEventDetail = {
  subQueries?: string[];
  sources?: Array<{ title: string; url: string }>;
  finding?: string;
  [key: string]: unknown;
};

export type ResearchEventType = "plan" | "search" | "analysis" | "synthesis" | "report" | "error";

export type SourceRecord = {
  title: string;
  url: string;
  domain: string;
  sourceType: string;
  excerpt: string;
  relevanceScore: number;
};
