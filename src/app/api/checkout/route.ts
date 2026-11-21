import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { planCheckout, productCheckout } from "@/server/billing";

const input = z.union([
  z.object({ kind: z.literal("product"), slug: z.string().min(1).max(120) }),
  z.object({ kind: z.literal("plan"), plan: z.enum(["pro", "business"]) }),
]);

export const POST = route(async (req) => {
  const user = await requireUser();
  await rateLimit(`checkout:${user.id}`, 10, 60);
  const data = await body(req, input);
  const url = data.kind === "product" ? await productCheckout(user, data.slug) : await planCheckout(user, data.plan);
  return { url };
});
