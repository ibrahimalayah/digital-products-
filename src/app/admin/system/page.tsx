import type { Metadata } from "next";
import { integrations } from "@/lib/env";
import { Badge, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "System" };

export default function AdminSystem() {
  const rows = [
    { name: "Database", ok: integrations.database(), fix: "Run `vercel integration add neon` and redeploy.", note: "Postgres. Without it the app only runs locally on embedded storage." },
    {
      name: "AI provider",
      ok: integrations.ai(),
      fix: "Set GOOGLE_GENERATIVE_AI_API_KEY (free key from Google AI Studio) or ANTHROPIC_API_KEY, or add a card to Vercel AI Gateway.",
      note: `${integrations.aiProvider()}. Powers every agent. Vercel AI Gateway also needs a card on the Vercel account before it answers.`,
    },
    { name: "Stripe payments", ok: integrations.stripe(), fix: "Run `vercel integration add stripe`.", note: "Store checkout and plan subscriptions." },
    { name: "Stripe webhook", ok: integrations.stripeWebhook(), fix: "Add a webhook to /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET.", note: "Confirms orders and plan changes." },
    { name: "Cron secret", ok: integrations.cron(), fix: "Set CRON_SECRET to a long random value.", note: "Protects the daily autopilot endpoint." },
    { name: "Encryption key", ok: integrations.encryption(), fix: "Set ENCRYPTION_KEY to a long random value.", note: "Encrypts creators' Buffer and Postiz keys." },
  ];
  return (
    <>
      <PageHeader eyebrow="Control panel" title="System status" description="Which integrations this deployment is connected to. Values are never shown." />
      <Card className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.name} className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-sm text-muted">{r.ok ? r.note : r.fix}</p>
            </div>
            <Badge tone={r.ok ? "accent" : "gold"}>{r.ok ? "Connected" : "Needs setup"}</Badge>
          </div>
        ))}
      </Card>
    </>
  );
}
