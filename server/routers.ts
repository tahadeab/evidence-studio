import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { sdk, buildSessionCookie } from "./_core/sdk";
import { researchRouter } from "./routers/research";

const loginSchema = z.object({
  userName: z.string().trim().min(1).max(80),
  accessCode: z.string().max(200).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
      if (!(await sdk.validateLogin(input.accessCode ?? ""))) {
        throw new Error("Invalid access code");
      }
      const sessionToken = await sdk.createSessionToken({
        openId: "local-user",
        name: input.userName,
      });
      const session = buildSessionCookie(ctx.req, sessionToken);
      ctx.res.cookie(session.name, session.value, session.options as any);
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  research: researchRouter,
});

export type AppRouter = typeof appRouter;

