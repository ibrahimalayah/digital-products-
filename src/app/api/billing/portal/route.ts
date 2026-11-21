import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { portalUrl } from "@/server/billing";

export const POST = route(async () => {
  const user = await requireUser();
  return { url: await portalUrl(user) };
});
