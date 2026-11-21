import { rateLimit } from "./rate-limit";
import { limitReached } from "./errors";
import { getPlan } from "./plans";
import { AppError } from "./errors";

const DAILY_AI_CALLS = { free: 30, pro: 300, business: 1500 } as const;

/**
 * Bounds what one account can cost: a short burst limit plus a per-day ceiling
 * on AI calls that scales with the plan. Applies to every AI endpoint,
 * including the ones not covered by a monthly quota.
 */
export async function aiGuard(user: { id: string; plan: string }) {
  await rateLimit(`ai:${user.id}`, 20, 60);
  const plan = getPlan(user.plan);
  try {
    await rateLimit(`ai-day:${user.id}`, DAILY_AI_CALLS[plan.id], 86_400);
  } catch (e) {
    if (e instanceof AppError && e.status === 429) throw limitReached(`You have reached today's AI limit on the ${plan.name} plan. It resets at midnight UTC.`);
    throw e;
  }
}
