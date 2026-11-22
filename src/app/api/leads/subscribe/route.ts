import { z } from "zod";
import { body, route } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { addLead } from "@/server/leads";

// On Vercel the first hop sets these headers, so a visitor cannot forge them.
const clientIp = (req: Request) => req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

/**
 * Public: a store visitor leaves their email for one product. Same-origin only
 * (see route()), rate-limited per address, and consent must be given. The reply
 * never reveals whether the product exists or the email was already there.
 */
export const POST = route(async (req) => {
  await rateLimit(`lead:${clientIp(req)}`, 5, 600);
  const input = await body(
    req,
    z.object({
      productId: z.string().min(1).max(80),
      email: z.email().max(200),
      consent: z.literal(true),
    }),
  );
  await addLead(input.productId, input.email);
  return { ok: true };
});
