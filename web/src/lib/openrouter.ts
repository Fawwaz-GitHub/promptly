import { buildMessages, type Mode } from "./prompts.ts";

export interface Refinement {
  improved: string;
  changes: string[];
  model: string;
}

export class UpstreamError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

const ENDPOINT = `${process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"}/chat/completions`;

export function getModels(): string[] {
  const primary = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

/** Pull the JSON object out of a model reply (models sometimes wrap it in ``` fences or prose). */
export function parseModelOutput(raw: string): { improved: string; changes: string[] } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      if (obj && typeof obj.improved === "string" && obj.improved.trim()) {
        const changes = Array.isArray(obj.changes)
          ? obj.changes.filter((c: unknown): c is string => typeof c === "string").slice(0, 5)
          : [];
        return { improved: obj.improved.trim(), changes };
      }
    } catch {
      /* fall through */
    }
  }
  // Fallback: treat the whole reply as the improved prompt.
  if (!cleaned) throw new UpstreamError("Empty response from model");
  return { improved: cleaned, changes: [] };
}

export async function refinePrompt(text: string, mode: Mode): Promise<Refinement> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new UpstreamError("OPENROUTER_API_KEY is not set on the server", 500);

  const models = getModels();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Promptly",
    },
    body: JSON.stringify({
      model: models[0],
      models, // OpenRouter tries these in order if one is unavailable/rate-limited
      messages: buildMessages(text, mode),
      temperature: mode === "grammar" ? 0.1 : 0.4,
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const status = res.status === 429 ? 503 : 502;
    throw new UpstreamError(
      res.status === 429
        ? "The free AI model is busy right now. Please try again in a moment."
        : `AI provider error (${res.status}) ${body.slice(0, 200)}`,
      status,
    );
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new UpstreamError("AI provider returned no content");
  return { ...parseModelOutput(content), model: data.model || models[0] };
}
