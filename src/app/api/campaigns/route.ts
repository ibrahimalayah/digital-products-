import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { createCampaign, listCampaigns } from "@/server/campaigns";

const input = z.object({
  productId: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(100),
  objective: z.enum(["sales", "awareness", "leads"]),
  monthlyBudgetCents: z.number().int().min(0).max(100_000_00),
  postsPerDay: z.number().int().min(1).max(10),
  channels: z
    .array(
      z.object({
        integrationId: z.string().max(100).nullable(),
        identifier: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
        name: z.string().trim().min(1).max(80),
      }),
    )
    .min(1)
    .max(12),
});

export const GET = route(async () => {
  const user = await requireUser();
  return { campaigns: await listCampaigns(user.id) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  await rateLimit(`write:${user.id}`, 60, 60);
  return { campaign: await createCampaign(user, await body(req, input)) };
});
