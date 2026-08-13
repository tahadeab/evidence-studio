import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createResearchSchema, providerConfigSchema } from "../../shared/research";
import {
  createResearchTask,
  getProviderPreference,
  getResearchEvents,
  getResearchSources,
  getResearchTask,
  listResearchTasks,
  saveProviderPreference,
} from "../research/db";
import { advanceResearchStep } from "../research/orchestrator";
import { invokeProvider } from "../research/providers";
import { protectedProcedure, router } from "../_core/trpc";

const researchIdSchema = z.object({ researchId: z.string().min(8).max(36) });

async function ownedTask(userId: number, researchId: string) {
  const task = await getResearchTask(userId, researchId);
  if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Research session not found." });
  return task;
}

export const researchRouter = router({
  list: protectedProcedure.query(({ ctx }) => listResearchTasks(ctx.user.id)),
  preference: protectedProcedure.query(({ ctx }) => getProviderPreference(ctx.user.id)),
  savePreference: protectedProcedure.input(providerConfigSchema.omit({ apiKey: true })).mutation(async ({ ctx, input }) => {
    await saveProviderPreference({ userId: ctx.user.id, provider: input.provider, model: input.model });
    return { success: true } as const;
  }),
  verifyProvider: protectedProcedure.input(providerConfigSchema).mutation(async ({ input }) => {
    const response = await invokeProvider(input, [
      { role: "user", content: "Reply with the single word ready." },
    ]);
    return { success: true as const, preview: response.slice(0, 80) };
  }),
  launch: protectedProcedure.input(createResearchSchema).mutation(async ({ ctx, input }) => {
    const researchId = nanoid(16);
    await saveProviderPreference({ userId: ctx.user.id, provider: input.providerConfig.provider, model: input.providerConfig.model });
    await createResearchTask({
      id: researchId,
      userId: ctx.user.id,
      title: input.title?.trim() || input.query.trim().slice(0, 90),
      query: input.query,
      provider: input.providerConfig.provider,
      model: input.providerConfig.model,
    });
    return { researchId, status: "running" as const };
  }),
  advance: protectedProcedure.input(z.object({ researchId: z.string().min(8).max(36), researchInput: createResearchSchema })).mutation(async ({ ctx, input }) => {
    await ownedTask(ctx.user.id, input.researchId);
    return advanceResearchStep({ researchId: input.researchId, userId: ctx.user.id, researchInput: input.researchInput });
  }),
  detail: protectedProcedure.input(researchIdSchema).query(async ({ ctx, input }) => {
    const task = await ownedTask(ctx.user.id, input.researchId);
    const [events, sources] = await Promise.all([getResearchEvents(input.researchId), getResearchSources(input.researchId)]);
    return { task, events, sources };
  }),
  report: protectedProcedure.input(researchIdSchema).query(async ({ ctx, input }) => {
    const task = await ownedTask(ctx.user.id, input.researchId);
    if (task.status !== "completed" || !task.reportContent) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The report is not available yet." });
    }
    return { markdown: task.reportContent, title: task.title };
  }),
  exportMarkdown: protectedProcedure.input(researchIdSchema).query(async ({ ctx, input }) => {
    const task = await ownedTask(ctx.user.id, input.researchId);
    if (task.status !== "completed" || !task.reportContent) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The report is not available yet." });
    }
    return {
      title: task.title,
      filename: `${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "research-report"}.md`,
      contentType: "text/markdown",
      markdown: task.reportContent,
    };
  }),
});
