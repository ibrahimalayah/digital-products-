import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deleteLead } from "@/server/leads";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await deleteLead(user.id, id);
  return { ok: true };
});
