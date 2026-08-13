import type { ProviderConfig, ResearchProvider } from "../../shared/research";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export const PROVIDER_DEFAULTS: Record<ResearchProvider, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
};

type ProviderRequest = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function apiKeyFor(config: ProviderConfig) {
  if (!config.apiKey) {
    throw new Error(`An API key is required for ${config.provider}. Enter your provider API key in the settings panel.`);
  }
  return config.apiKey;
}

export function createProviderRequest(config: ProviderConfig, messages: LlmMessage[]): ProviderRequest {
  const apiKey = apiKeyFor(config);
  const commonBody = { model: config.model, messages, temperature: 0.2, max_tokens: 2_400 };

  if (config.provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: commonBody,
    };
  }
  if (config.provider === "groq") {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: commonBody,
    };
  }
  if (config.provider === "gemini") {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: commonBody,
    };
  }
  if (config.provider === "anthropic") {
    const system = messages.filter(message => message.role === "system").map(message => message.content).join("\n\n");
    const conversation = messages.filter(message => message.role !== "system");
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: { model: config.model, max_tokens: 2_400, temperature: 0.2, system, messages: conversation },
    };
  }
  throw new Error(`Unsupported provider: ${config.provider}`);
}

function readOpenAiText(payload: unknown) {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  throw new Error("The provider returned no usable response content.");
}

function readAnthropicText(payload: unknown) {
  const content = (payload as { content?: Array<{ type?: string; text?: string }> })?.content;
  const text = content?.filter(part => part.type === "text").map(part => part.text ?? "").join("\n").trim();
  if (text) return text;
  throw new Error("The provider returned no usable response content.");
}

export async function invokeProvider(config: ProviderConfig, messages: LlmMessage[]): Promise<string> {
  const request = createProviderRequest(config, messages);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = (payload as { error?: { message?: string }; message?: string } | null)?.error?.message
        ?? (payload as { message?: string } | null)?.message
        ?? `HTTP ${response.status}`;
      throw new Error(`${config.provider} request failed: ${detail}`);
    }
    return config.provider === "anthropic" ? readAnthropicText(payload) : readOpenAiText(payload);
  } finally {
    clearTimeout(timer);
  }
}
