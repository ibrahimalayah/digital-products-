import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { aiGuard } from "@/lib/ai-guard";
import { listIdeas, runIdeaResearch } from "@/server/ideas";

export const maxDuration = 120;

export const GET = route(async () => {
  const user = await requireUser();
  return { ideas: await listIdeas(user.id) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  await aiGuard(user);
  const { niche } = await body(req, z.object({ niche: z.string().trim().min(3).max(200) }));
  return { ideas: await runIdeaResearch(user, niche) };
});
