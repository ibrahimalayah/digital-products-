import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deletePost, updatePost } from "@/server/campaigns";

const patch = z.object({ content: z.string().trim().min(1).max(3000), approved: z.boolean() }).partial().strict();

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  return { post: await updatePost(user.id, id, await body(req, patch)) };
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await deletePost(user.id, id);
  return { ok: true };
});
