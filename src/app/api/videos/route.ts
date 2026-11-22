import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { aiGuard } from "@/lib/ai-guard";
import { VOICE_IDS } from "@/lib/voices";
import { createVideo, listVideos } from "@/server/videos";

export const maxDuration = 120;

export const GET = route(async () => {
  const user = await requireUser();
  return { videos: await listVideos(user.id) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  await aiGuard(user);
  const input = await body(
    req,
    z.object({
      productId: z.string().min(1).max(80),
      seconds: z.union([z.literal(15), z.literal(30), z.literal(45)]),
      goal: z.enum(["leads", "sales"]),
      voice: z.enum(VOICE_IDS),
    }),
  );
  return { video: await createVideo(user, input) };
});
