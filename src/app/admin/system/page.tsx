import type { Metadata } from "next";
import { integrations } from "@/lib/env";
import { getT } from "@/lib/i18n-server";
import { emailReady } from "@/lib/email";
import { Badge, Card, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("System") };
}

export default async function AdminSystem() {
  const t = await getT();
  const rows = [
    {
      name: t("Database"),
      ok: integrations.database(),
      fix: t("Run `vercel integration add neon` and redeploy."),
      note: t("Postgres. Without it the app only runs locally on embedded storage."),
    },
    {
      name: t("AI provider"),
      ok: integrations.aiChain() || Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY),
      fix: t("Set GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY (all have free tiers), or add a card to Vercel AI Gateway."),
      note: t("Order tried: {order}. Powers every agent.", { order: integrations.aiProvider() }),
    },
    { name: t("Stripe payments"), ok: integrations.stripe(), fix: t("Run `vercel integration add stripe`."), note: t("Store checkout and plan subscriptions.") },
    {
      name: t("Stripe webhook"),
      ok: integrations.stripeWebhook(),
      fix: t("Add a webhook to /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET."),
      note: t("Confirms orders and plan changes."),
    },
    { name: t("Email sending"), ok: emailReady(), fix: t("Set SMTP_USER and SMTP_PASS (a Gmail address and its app password), or RESEND_API_KEY, or BREVO_API_KEY with EMAIL_FROM."), note: t("Sends password reset links.") },
    { name: t("Cron secret"), ok: integrations.cron(), fix: t("Set CRON_SECRET to a long random value."), note: t("Protects the daily autopilot endpoint.") },
    {
      name: t("Encryption key"),
      ok: integrations.encryption(),
      fix: t("Set ENCRYPTION_KEY to a long random value."),
      note: t("Encrypts creators' Buffer and Postiz keys."),
    },
  ];
  return (
    <>
      <PageHeader eyebrow={t("Control panel")} title={t("System status")} description={t("Which integrations this deployment is connected to. Values are never shown.")} />
      <Card className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.name} className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-sm text-muted">{r.ok ? r.note : r.fix}</p>
            </div>
            <Badge tone={r.ok ? "accent" : "gold"}>{r.ok ? t("Connected") : t("Needs setup")}</Badge>
          </div>
        ))}
      </Card>
    </>
  );
}
