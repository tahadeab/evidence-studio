import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the local sign-in flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const researchTasks = mysqlTable("research_tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  query: text("query").notNull(),
  provider: mysqlEnum("provider", ["openai", "anthropic", "gemini", "groq"]).notNull(),
  model: varchar("model", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  reportContent: text("reportContent"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [
  index("research_tasks_user_updated_idx").on(table.userId, table.updatedAt),
]);

export const researchEvents = mysqlTable("research_events", {
  id: int("id").autoincrement().primaryKey(),
  researchId: varchar("researchId", { length: 36 }).notNull(),
  sequence: int("sequence").notNull(),
  type: mysqlEnum("type", ["plan", "search", "analysis", "synthesis", "report", "error"]).notNull(),
  message: text("message").notNull(),
  detail: json("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("research_events_research_sequence_idx").on(table.researchId, table.sequence),
]);

export const researchSources = mysqlTable("research_sources", {
  id: int("id").autoincrement().primaryKey(),
  researchId: varchar("researchId", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  url: text("url").notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  sourceType: varchar("sourceType", { length: 64 }).notNull(),
  excerpt: text("excerpt").notNull(),
  relevanceScore: int("relevanceScore").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("research_sources_research_score_idx").on(table.researchId, table.relevanceScore),
]);

/** Stores a user's selected provider and model. API keys are intentionally never persisted. */
export const providerPreferences = mysqlTable("provider_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["openai", "anthropic", "gemini", "groq"]).notNull(),
  model: varchar("model", { length: 160 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("provider_preferences_user_unique").on(table.userId),
]);

/** Structured report data complements the human-readable Markdown stored on the task. */
export const researchReports = mysqlTable("research_reports", {
  researchId: varchar("researchId", { length: 36 }).primaryKey(),
  executiveSummary: text("executiveSummary").notNull(),
  findings: json("findings").notNull(),
  sources: json("sources").notNull(),
  markdown: text("markdown").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ResearchTask = typeof researchTasks.$inferSelect;
export type ResearchEvent = typeof researchEvents.$inferSelect;
export type ResearchSource = typeof researchSources.$inferSelect;
export type ProviderPreference = typeof providerPreferences.$inferSelect;
export type ResearchReport = typeof researchReports.$inferSelect;
