import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { createProduct, listProducts } from "@/server/products";
import { getIdea } from "@/server/ideas";

const input = z.union([
  z.object({ ideaId: z.string().min(1).max(64) }),
  z.object({
    title: z.string().trim().min(3).max(140),
    promise: z.string().trim().min(10).max(400),
    audience: z.string().trim().min(3).max(400),
    format: z.string().trim().min(3).max(400),
    tone: z.string().trim().max(200).optional(),
    pageSize: z.enum(["LETTER", "A4"]).optional(),
    priceCents: z.number().int().min(0).max(99_900).optional(),
  }),
]);

export const GET = route(async () => {
  const user = await requireUser();
  return { products: await listProducts(user.id) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  await rateLimit(`write:${user.id}`, 60, 60);
  const data = await body(req, input);
  if ("ideaId" in data) {
    const idea = await getIdea(user.id, data.ideaId);
    const product = await createProduct(user, {
      title: idea.title,
      promise: idea.promise,
      audience: idea.audience,
      format: idea.format,
      priceCents: idea.suggestedPriceCents,
      ideaId: idea.id,
    });
    return { product };
  }
  return { product: await createProduct(user, data) };
});
