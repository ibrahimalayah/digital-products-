import type { Metadata } from "next";
import { CalendarClock, Clapperboard, Megaphone, PenLine, Send, Sparkles } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { listRuns } from "@/server/agents-log";
import { publicSettings } from "@/server/settings";
import { Badge, Card, PageHeader, statusTone } from "@/components/ui";
import { SettingSwitch } from "@/components/studio/toggles";
import { dateTime } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { getI18n, getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Agents") };
}

// Display names for agent ids, as shown on activity badges.
const AGENT_LABEL: Record<string, string> = {
  "idea-scout": msg("idea scout"),
  "product-writer": msg("product writer"),
  "video-writer": msg("video writer"),
  "ad-planner": msg("ad planner"),
  "daily-poster": msg("daily poster"),
  publisher: msg("publisher"),
};

const AGENTS = [
  { id: "idea-scout", icon: Sparkles, name: msg("Idea scout"), when: msg("On demand, in the idea lab"), does: msg("Turns a niche into specific product ideas.") },
  { id: "product-writer", icon: PenLine, name: msg("Product writer"), when: msg("On demand, per product"), does: msg("Plans the outline and writes every page.") },
  { id: "video-writer", icon: Clapperboard, name: msg("Video writer"), when: msg("On demand, under Lead videos"), does: msg("Scripts a short vertical video that sends viewers to a product.") },
  { id: "ad-planner", icon: Megaphone, name: msg("Ad planner"), when: msg("When a campaign is created or replanned"), does: msg("Splits the budget across channels and sets angles.") },
  { id: "daily-poster", icon: CalendarClock, name: msg("Daily poster"), when: msg("Every morning with autopilot, or on demand"), does: msg("Writes the day's posts for each active campaign.") },
  { id: "publisher", icon: Send, name: msg("Publisher"), when: msg("After approval, or automatically"), does: msg("Schedules posts to your accounts through Buffer or Postiz.") },
];

export default async function Agents() {
  const user = await requireUserPage("/app/agents");
  const plan = getPlan(user.plan);
  const [settings, runs, { t, lang }] = await Promise.all([publicSettings(user.id), listRuns(user.id, 40), getI18n()]);
  return (
    <>
      <PageHeader eyebrow={t("Agents")} title={t("Your automation team")} description={t("Five agents, each with one job. Autopilot runs the last two every morning at 08:00 UTC.")} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Card className="space-y-6 p-6">
            <SettingSwitch
              field="autopilot"
              initial={settings.autopilot}
              label={t("Daily autopilot")}
              description={t("Write today's posts for every active campaign each morning.")}
              locked={plan.limits.autopilot ? undefined : t("Available on Pro and Business.")}
            />
            <SettingSwitch
              field="autoApprove"
              initial={settings.autoApprove}
              label={t("Auto-approve and publish")}
              description={t("Skip the review step: autopilot publishes new posts without waiting for you.")}
              locked={plan.id === "business" ? undefined : t("Available on Business.")}
            />
            {!settings.publisherConnected ? <p className="rounded-xl bg-gold-soft px-3.5 py-2.5 text-sm text-gold">{t("Connect Buffer (free) in Settings so the publisher can reach your social accounts.")}</p> : null}
          </Card>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {AGENTS.map((a) => (
              <li key={a.id} className="flex gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <a.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{t(a.name)}</p>
                  <p className="text-sm">{t(a.does)}</p>
                  <p className="mt-0.5 text-xs text-muted">{t(a.when)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Card className="p-6 lg:self-start">
          <h2 className="font-display text-2xl">{t("Activity log")}</h2>
          {runs.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("No runs yet.")}</p>
          ) : (
            <ol className="mt-4 divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={statusTone(r.status)}>{t(AGENT_LABEL[r.agent] ?? r.agent.replace("-", " "))}</Badge>
                    <time className="text-xs text-muted">{dateTime(r.createdAt, lang)}</time>
                  </div>
                  <p className="mt-1.5 text-sm">{r.summary}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
