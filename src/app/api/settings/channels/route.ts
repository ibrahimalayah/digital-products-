import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { listChannels } from "@/lib/postiz";
import { getPostizKey } from "@/server/settings";

export const GET = route(async () => {
  const user = await requireUser();
  const key = await getPostizKey(user.id);
  if (!key) return { connected: false, channels: [] };
  const channels = (await listChannels(key)).filter((c) => !c.disabled);
  return { connected: true, channels };
});
