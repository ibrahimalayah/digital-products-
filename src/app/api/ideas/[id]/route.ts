import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deleteIdea } from "@/server/ideas";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await deleteIdea(user.id, id);
  return { ok: true };
});
