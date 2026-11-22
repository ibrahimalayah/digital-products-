import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { VOICE_IDS } from "@/lib/voices";
import { deleteVideo, updateVideo } from "@/server/videos";

const text = (max: number) => z.string().trim().min(1).max(max);

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const patch = await body(
    req,
    z.object({
      voice: z.enum(VOICE_IDS).optional(),
      scenes: z.array(z.object({ caption: text(80), narration: text(400) })).min(2).max(8).optional(),
    }),
  );
  return { video: await updateVideo(user.id, id, patch) };
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await deleteVideo(user.id, id);
  return { ok: true };
});
