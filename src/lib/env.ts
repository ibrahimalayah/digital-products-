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
    Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL),
  cron: () => Boolean(process.env.CRON_SECRET),
  encryption: () => Boolean(process.env.ENCRYPTION_KEY),
};
