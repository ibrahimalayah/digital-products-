import type { Metadata } from "next";
import { integrations } from "@/lib/env";
import { Badge, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "System" };

export default function AdminSystem() {
  const rows = [
    { name: "Database", ok: integrations.database(), fix: "Run `vercel integration add neon` and redeploy.", note: "Postgres. Without it the app only runs locally on embedded storage." },
    { name: "AI Gateway", ok: integrations.ai(), fix: "Enable AI Gateway for the project or set AI_GATEWAY_API_KEY.", note: "Powers every agent." },
    { name: "Stripe payments", ok: integrations.stripe(), fix: "Run `vercel integration add stripe`.", note: "Store checkout and plan subscriptions." },
    { name: "Stripe webhook", ok: integrations.stripeWebhook(), fix: "Add a webhook to /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET.", note: "Confirms orders and plan changes." },
    { name: "Cron secret", ok: integrations.cron(), fix: "Set CRON_SECRET to a long random value.", note: "Protects the daily autopilot endpoint." },
    { name: "Encryption key", ok: integrations.encryption(), fix: "Set ENCRYPTION_KEY to a long random value.", note: "Encrypts creators' Postiz keys. Falls back to the auth secret." },
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
