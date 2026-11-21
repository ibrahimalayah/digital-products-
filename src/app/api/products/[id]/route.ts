import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deleteProduct, getOwnedProduct, updateProduct } from "@/server/products";

const patch = z
  .object({
    title: z.string().trim().min(3).max(140),
    promise: z.string().trim().min(10).max(400),
    audience: z.string().trim().min(3).max(400),
    format: z.string().trim().min(3).max(400),
    tone: z.string().trim().min(2).max(200),
    pageSize: z.enum(["LETTER", "A4"]),
    priceCents: z.number().int().min(0).max(99_900),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    published: z.boolean(),
  })
  .partial()
  .strict();

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return { product: await getOwnedProduct(user.id, id) };
});

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  return { product: await updateProduct(user, id, await body(req, patch)) };
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await deleteProduct(user, id);
  return { ok: true };
});
