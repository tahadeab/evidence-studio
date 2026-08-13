import { describe, expect, it } from "vitest";
import { createProviderRequest } from "./providers";

const messages = [{ role: "user" as const, content: "Test message" }];
const apiKey = "test-key-123456";

describe("createProviderRequest", () => {
  it("creates the expected OpenAI-compatible requests", () => {
    const cases = [
      ["openai", "https://api.openai.com/v1/chat/completions"],
      ["groq", "https://api.groq.com/openai/v1/chat/completions"],
      ["gemini", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"],
    ] as const;

    cases.forEach(([provider, expectedUrl]) => {
      const request = createProviderRequest({ provider, model: "sample-model", apiKey }, messages);
      expect(request.url).toBe(expectedUrl);
      expect(request.headers.authorization).toBe(`Bearer ${apiKey}`);
      expect(request.body).toMatchObject({ model: "sample-model", messages });
    });
  });

  it("creates Anthropic Messages requests with system content separated", () => {
    const request = createProviderRequest({ provider: "anthropic", model: "claude-test", apiKey }, [
      { role: "system", content: "Be concise." },
      { role: "user", content: "Test message" },
    ]);
    expect(request.url).toBe("https://api.anthropic.com/v1/messages");
    expect(request.headers["x-api-key"]).toBe(apiKey);
    expect(request.body).toMatchObject({ model: "claude-test", system: "Be concise.", messages });
  });

  it("requires a transient key for external providers", () => {
    expect(() => createProviderRequest({ provider: "groq", model: "sample-model" }, messages)).toThrow("API key is required");
  });
});
