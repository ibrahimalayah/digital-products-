import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { aiGuard } from "@/lib/ai-guard";
import { generateOutline, generateSection } from "@/server/products";

export const maxDuration = 120;

const input = z.union([z.object({ step: z.literal("outline") }), z.object({ step: z.literal("section"), index: z.number().int().min(0).max(12) })]);

// The client drives generation one step at a time: outline, then each section.
export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  await aiGuard(user);
  const data = await body(req, input);
  const product = data.step === "outline" ? await generateOutline(user, id) : await generateSection(user, id, data.index);
  return { product };
});
