import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { publishPost } from "@/server/campaigns";

export const POST = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await rateLimit(`publish:${user.id}`, 30, 60);
  return { post: await publishPost(user.id, id) };
});
