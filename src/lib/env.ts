// Central, lazy access to configuration. Nothing here throws at import time so
// the app can render a clear "not configured" state instead of crashing.

export function appUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL && process.env.VERCEL_ENV === "production")
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function authSecret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be set to at least 32 characters in production.");
  }
  return "dev-only-secret-not-for-production-use-0000";
}

export const integrations = {
  database: () => Boolean(process.env.DATABASE_URL),
  stripe: () => Boolean(process.env.STRIPE_SECRET_KEY),
  stripeWebhook: () => Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  ai: () =>
    Boolean(
      process.env.GROQ_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        (process.env.FREELLMAPI_BASE_URL && process.env.FREELLMAPI_API_KEY) ||
        process.env.OPENAI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.AI_GATEWAY_API_KEY ||
        process.env.VERCEL_OIDC_TOKEN ||
        process.env.VERCEL,
    ),
  aiProvider: () => {
    const chain = [
      process.env.FREELLMAPI_BASE_URL && process.env.FREELLMAPI_API_KEY ? "FreeLLMAPI" : "",
      process.env.GROQ_API_KEY ? "Groq" : "",
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "Gemini" : "",
      process.env.OPENROUTER_API_KEY ? "OpenRouter" : "",
      process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEYS ? "OpenAI" : "",
    ].filter(Boolean);
    const last = process.env.ANTHROPIC_API_KEY ? "Anthropic" : "Vercel AI Gateway";
    return chain.length ? `${chain.join(" → ")}, then ${last}` : last;
  },
  /** True when at least one free-tier or OpenAI key is set, so AI works without the gateway. */
  aiChain: () => Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEYS || (process.env.FREELLMAPI_BASE_URL && process.env.FREELLMAPI_API_KEY)),
  cron: () => Boolean(process.env.CRON_SECRET),
  encryption: () => Boolean(process.env.ENCRYPTION_KEY),
};
