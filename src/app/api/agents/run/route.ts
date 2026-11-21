import { route } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { runAutopilot } from "@/server/autopilot";

export const maxDuration = 300;

// Lets the platform owner trigger the daily autopilot by hand from the control panel.
export const POST = route(async () => {
  const admin = await requireAdmin();
  await rateLimit(`autopilot:${admin.id}`, 3, 300);
  return { report: await runAutopilot() };
});
