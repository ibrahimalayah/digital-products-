import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { aiGuard } from "@/lib/ai-guard";
import { generateDayPosts, listPosts } from "@/server/campaigns";

export const maxDuration = 120;

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return { posts: await listPosts(user.id, id) };
});

export const POST = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await aiGuard(user);
  return { posts: await generateDayPosts(user, id) };
});
