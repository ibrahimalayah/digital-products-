import { route } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { adminUnpublish } from "@/server/admin";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await requireAdmin();
  await adminUnpublish(id);
  return { ok: true };
});
