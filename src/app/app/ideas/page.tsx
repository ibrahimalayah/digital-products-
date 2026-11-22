import type { Metadata } from "next";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { listIdeas } from "@/server/ideas";
import { PageHeader } from "@/components/ui";
import { IdeaLab } from "@/components/studio/idea-lab";

export const metadata: Metadata = { title: "Idea lab" };

export default async function Ideas({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const user = await requireUserPage("/app/ideas");
  const { niche } = await searchParams;
  const [ideas, usage] = await Promise.all([listIdeas(user.id), getUsage(user.id)]);
  const remaining = Math.max(0, getPlan(user.plan).limits.ideasPerMonth - usage.ideas);
  return (
    <>
      <PageHeader eyebrow="Idea lab" title="What should you make next?" description="The idea scout proposes small, specific products with a clear promise. Demand notes are reasoning, not measured data, so check the suggested searches before you build." />
      <IdeaLab initial={ideas} remaining={remaining} startNiche={typeof niche === "string" ? niche.slice(0, 200) : ""} />
    </>
  );
}
