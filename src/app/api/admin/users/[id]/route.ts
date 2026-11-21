import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { adminUpdateUser } from "@/server/admin";

const patch = z
  .object({ plan: z.enum(["free", "pro", "business"]), role: z.enum(["user", "admin"]), suspended: z.boolean() })
  .partial()
  .strict();

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const admin = await requireAdmin();
  await adminUpdateUser(admin.id, id, await body(req, patch));
  return { ok: true };
});
