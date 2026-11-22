import type { Metadata } from "next";
import { CalendarClock, Clapperboard, Megaphone, PenLine, Send, Sparkles } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { listRuns } from "@/server/agents-log";
import { publicSettings } from "@/server/settings";
import { Badge, Card, PageHeader, statusTone } from "@/components/ui";
import { SettingSwitch } from "@/components/studio/toggles";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Agents" };

const AGENTS = [
  { id: "idea-scout", icon: Sparkles, name: "Idea scout", when: "On demand, in the idea lab", does: "Turns a niche into specific product ideas." },
  { id: "product-writer", icon: PenLine, name: "Product writer", when: "On demand, per product", does: "Plans the outline and writes every page." },
  { id: "video-writer", icon: Clapperboard, name: "Video writer", when: "On demand, under Lead videos", does: "Scripts a short vertical video that sends viewers to a product." },
  { id: "ad-planner", icon: Megaphone, name: "Ad planner", when: "When a campaign is created or replanned", does: "Splits the budget across channels and sets angles." },
  { id: "daily-poster", icon: CalendarClock, name: "Daily poster", when: "Every morning with autopilot, or on demand", does: "Writes the day's posts for each active campaign." },
  { id: "publisher", icon: Send, name: "Publisher", when: "After approval, or automatically", does: "Schedules posts to your accounts through Buffer or Postiz." },
];

export default async function Agents() {
  const user = await requireUserPage("/app/agents");
  const plan = getPlan(user.plan);
  const [settings, runs] = await Promise.all([publicSettings(user.id), listRuns(user.id, 40)]);
  return (
    <>
      <PageHeader eyebrow="Agents" title="Your automation team" description="Five agents, each with one job. Autopilot runs the last two every morning at 08:00 UTC." />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Card className="space-y-6 p-6">
            <SettingSwitch
              field="autopilot"
              initial={settings.autopilot}
              label="Daily autopilot"
              description="Write today's posts for every active campaign each morning."
              locked={plan.limits.autopilot ? undefined : "Available on Pro and Business."}
            />
            <SettingSwitch
              field="autoApprove"
              initial={settings.autoApprove}
              label="Auto-approve and publish"
              description="Skip the review step: autopilot publishes new posts without waiting for you."
              locked={plan.id === "business" ? undefined : "Available on Business."}
            />
            {!settings.publisherConnected ? <p className="rounded-xl bg-gold-soft px-3.5 py-2.5 text-sm text-gold">Connect Buffer (free) in Settings so the publisher can reach your social accounts.</p> : null}
          </Card>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {AGENTS.map((a) => (
              <li key={a.id} className="flex gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <a.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm">{a.does}</p>
                  <p className="mt-0.5 text-xs text-muted">{a.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Card className="p-6 lg:self-start">
          <h2 className="font-display text-2xl">Activity log</h2>
          {runs.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No runs yet.</p>
          ) : (
            <ol className="mt-4 divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={statusTone(r.status)}>{r.agent.replace("-", " ")}</Badge>
                    <time className="text-xs text-muted">{dateTime(r.createdAt)}</time>
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
