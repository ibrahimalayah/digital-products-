import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deleteCampaign, updateCampaign } from "@/server/campaigns";

const patch = z
  .object({
    name: z.string().trim().min(2).max(100),
    monthlyBudgetCents: z.number().int().min(0).max(100_000_00),
    postsPerDay: z.number().int().min(1).max(10),
    status: z.enum(["draft", "active", "paused"]),
  })
  .partial()
  .strict();

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  return { campaign: await updateCampaign(user, id, await body(req, patch)) };
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await deleteCampaign(user.id, id);
  return { ok: true };
});
