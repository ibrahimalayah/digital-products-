import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { publicSettings, updateSettings } from "@/server/settings";

const patch = z
  .object({
    brandName: z.string().trim().max(80),
    brandVoice: z.string().trim().max(600),
    autopilot: z.boolean(),
    autoApprove: z.boolean(),
    postizKey: z.string().trim().min(8).max(300).nullable(),
  })
  .partial()
  .strict();

export const GET = route(async () => {
  const user = await requireUser();
  return { settings: await publicSettings(user.id) };
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  await rateLimit(`write:${user.id}`, 60, 60);
  return { settings: await updateSettings(user, await body(req, patch)) };
});
