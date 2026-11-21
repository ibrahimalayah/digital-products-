import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { aiGuard } from "@/lib/ai-guard";
import { planCampaign } from "@/server/campaigns";

export const maxDuration = 120;

export const POST = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await aiGuard(user);
  return { campaign: await planCampaign(user, id) };
});
