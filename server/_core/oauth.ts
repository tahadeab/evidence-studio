import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import { sdk, buildSessionCookie } from "./sdk";

function getBodyValue(req: Request, key: string): string | undefined {
  const value = (req.body as Record<string, unknown>)?.[key];
  return typeof value === "string" ? value : undefined;
}

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Body: { accessCode?: string }
   * Authenticates the visitor with the configured ADMIN_CODE (if set) and
   * returns a signed session cookie. Any visitor name is accepted; the
   * session identifies the user for protected research operations.
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const accessCode = getBodyValue(req, "accessCode") ?? "";
      const userName = (getBodyValue(req, "userName") ?? "Local user").slice(0, 80);

      if (!(await sdk.validateLogin(accessCode))) {
        res.status(401).json({ error: "Invalid access code" });
        return;
      }

      const sessionToken = await sdk.createSessionToken({ openId: "local-user", name: userName });
      const session = buildSessionCookie(req, sessionToken);
      res.cookie(session.name, session.value, session.options as any);
      res.json({ success: true, name: userName });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * POST /api/auth/logout
   * Clears the session cookie and ends the local session.
   */
  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: "/", secure: true, sameSite: "none" });
    res.json({ success: true });
  });
}
