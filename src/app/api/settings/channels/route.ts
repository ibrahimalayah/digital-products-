import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { listChannels } from "@/lib/publishers";
import { getPublisher } from "@/server/settings";

export const GET = route(async () => {
  const user = await requireUser();
  const auth = await getPublisher(user.id);
  if (!auth) return { connected: false, channels: [] };
  const channels = (await listChannels(auth)).filter((c) => !c.disabled);
  return { connected: true, publisher: auth.kind, channels };
});
