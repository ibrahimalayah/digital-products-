import { z } from "zod";

// The free-tier AI chain, ported from the Rekrutify project. Every provider
// speaks the OpenAI chat format and each one fails over to the next, so an
// exhausted or unavailable free tier never stops the agents answering.
// Variable names match Rekrutify, so the same keys work in both projects.

export type ChainProvider = {
  name: "freellmapi" | "groq" | "google" | "openrouter" | "huggingface" | "openai" | "keyless";
  baseUrl: string;
  key: string;
  model: string;
};

const env = (...names: string[]) => names.map((n) => process.env[n]?.trim()).find(Boolean) || "";

const FREE_TIERS = [
  { name: "groq", keys: ["GROQ_API_KEY"], modelVar: "GROQ_MODEL", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-20b" },
  { name: "google", keys: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"], modelVar: "GEMINI_MODEL", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.5-flash-lite" },
  { name: "openrouter", keys: ["OPENROUTER_API_KEY"], modelVar: "OPENROUTER_MODEL", baseUrl: "https://openrouter.ai/api/v1", model: "openrouter/free" },
  // Hugging Face Inference Providers: one token, many open models, routed to the fastest host.
  // Needs a token with the "Make calls to Inference Providers" permission; free accounts must add credits.
  { name: "huggingface", keys: ["HF_TOKEN", "HUGGINGFACE_API_KEY"], modelVar: "HF_MODEL", baseUrl: "https://router.huggingface.co/v1", model: "openai/gpt-oss-120b:fastest" },
] as const;

/**
 * Providers in the order they are tried:
 * 1. FreeLLMAPI, a self-hosted router over free tiers (local development).
 * 2. Groq, Google AI Studio and OpenRouter free tiers, when their keys are set.
 * 3. OpenAI keys, the paid fallback.
 */
export function chainProviders(): ChainProvider[] {
  const out: ChainProvider[] = [];
  const freeUrl = env("FREELLMAPI_BASE_URL").replace(/\/$/, "");
  const freeKey = env("FREELLMAPI_API_KEY");
  if (freeUrl && freeKey) out.push({ name: "freellmapi", baseUrl: freeUrl, key: freeKey, model: env("FREELLMAPI_MODEL") || "auto" });
  for (const tier of FREE_TIERS) {
    const key = env(...tier.keys);
    if (key) out.push({ name: tier.name, baseUrl: tier.baseUrl, key, model: env(tier.modelVar) || tier.model });
  }
  const baseUrl = (env("OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/$/, "");
  for (const key of env("OPENAI_API_KEYS", "OPENAI_API_KEY").split(",").map((k) => k.trim()).filter(Boolean)) {
    out.push({ name: "openai", baseUrl, key, model: env("OPENAI_MODEL") || "gpt-4o-mini" });
  }
  if (keylessAllowed()) out.push({ name: "keyless", baseUrl: KEYLESS_URL, key: "", model: "openai" });
  return out;
}

// Last resort: a public free tier that needs no key, so the agents answer even
// before any key is added. It is slow and limited to about one reply every 45
// seconds per address, so real keys always go first. Set AI_KEYLESS=0 to turn
// it off. Never used by automated tests.
const KEYLESS_URL = "https://text.pollinations.ai/openai";
export const keylessAllowed = () =>
  process.env.AI_KEYLESS !== "0" && process.env.NODE_ENV !== "test" && !process.env.ANTHROPIC_API_KEY && !process.env.AI_GATEWAY_API_KEY;

/** Reads "wait 41 seconds" or "Retry after 34s" out of a free tier's rate-limit reply. */
export function waitSeconds(text: string): number | null {
  const m = text.match(/(?:wait|retry after)\s+(\d{1,3})\s*s/i);
  return m ? Number(m[1]) : null;
}

// Free-tier models are often reasoning models whose hidden thinking counts
// against max_tokens, so they get extra room.
const REASONING_HEADROOM = 4096;
const ATTEMPT_MS = 55_000;
const ROUTER_ATTEMPTS = 2;

/** Pulls the JSON object out of a reply that may be wrapped in a code fence or prose. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(body.slice(start, end + 1));
}

export type ChainResult<T> = { ok: true; value: T; provider: ChainProvider["name"] } | { ok: false; reason: "none_configured" | "all_failed" };

/**
 * Asks each provider in turn for a JSON object matching `schema`. A provider
 * that errors, times out, is cut off or returns JSON that does not validate is
 * skipped and the next one is tried, all inside one time budget.
 */
export async function completeJson<T extends z.ZodType>(
  schema: T,
  system: string,
  prompt: string,
  maxTokens: number,
  providers: ChainProvider[] = chainProviders(),
  budgetMs = 105_000,
): Promise<ChainResult<z.infer<T>>> {
  if (providers.length === 0) return { ok: false, reason: "none_configured" };
  const deadline = Date.now() + budgetMs;
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const messages = [
    { role: "system", content: `${system}\n\nReply with one JSON object and nothing else: no prose, no code fence. It must match this JSON Schema:\n${jsonSchema}` },
    { role: "user", content: prompt },
  ];
  const attempts = providers.flatMap((p) => (p.name === "freellmapi" ? Array<ChainProvider>(ROUTER_ATTEMPTS).fill(p) : [p]));

  for (const p of attempts) {
    const free = p.name !== "openai";
    // Some free routers reject response_format; those are retried once without it.
    // A keyless tier that asks us to wait gets one more go after the wait.
    const modes = p.name === "keyless" ? [true, true, false] : [true, false];
    for (const jsonMode of modes) {
      const remaining = deadline - Date.now();
      if (remaining < 2_000) return { ok: false, reason: "all_failed" };
      try {
        const res = await fetch(`${p.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(p.key ? { Authorization: `Bearer ${p.key}` } : {}) },
          body: JSON.stringify({
            model: p.model,
            messages,
            temperature: 0.7,
            max_tokens: free ? maxTokens + REASONING_HEADROOM : maxTokens,
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: AbortSignal.timeout(Math.min(remaining, ATTEMPT_MS)),
          cache: "no-store",
        });
        if (!res.ok) {
          console.error(`[ai] ${p.name} upstream ${res.status}`);
          if (p.name === "keyless" && (res.status === 402 || res.status === 429)) {
            const wait = waitSeconds(await res.text().catch(() => ""));
            const left = deadline - Date.now();
            if (wait !== null && (wait + 1) * 1000 < left - 15_000) {
              await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
              continue;
            }
            break;
          }
          if (res.status === 400 && jsonMode) continue; // try again without response_format
          break;
        }
        const data = (await res.json()) as { choices?: { finish_reason?: string; message?: { content?: string | null } }[] };
        const choice = data.choices?.[0];
        const content = choice?.message?.content ?? "";
        if (!content.trim()) {
          console.error(`[ai] ${p.name} returned an empty reply`);
          break;
        }
        if (choice?.finish_reason === "length") {
          console.error(`[ai] ${p.name} reply was cut off`);
          break;
        }
        const parsed = schema.safeParse(extractJson(content));
        if (!parsed.success) {
          console.error(`[ai] ${p.name} reply did not match the expected shape`);
          break;
        }
        return { ok: true, value: parsed.data, provider: p.name };
      } catch (err) {
        console.error(`[ai] ${p.name} request failed: ${(err as Error).message.slice(0, 120)}`);
        break;
      }
    }
  }
  return { ok: false, reason: "all_failed" };
}
