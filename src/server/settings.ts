import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { getPlan } from "@/lib/plans";
import { badRequest, limitReached } from "@/lib/errors";
import { listChannels } from "@/lib/postiz";
import type { CurrentUser } from "@/lib/session";

export async function getSettings(userId: string) {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.userId, userId)).limit(1);
  if (row) return row;
  const [created] = await db.insert(schema.settings).values({ userId }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(schema.settings).where(eq(schema.settings.userId, userId)).limit(1);
  return again;
}

/** Client-safe view: the Postiz key is reduced to a boolean. */
export async function publicSettings(userId: string) {
  const s = await getSettings(userId);
  return {
    brandName: s.brandName,
    brandVoice: s.brandVoice,
    autopilot: s.autopilot,
    autoApprove: s.autoApprove,
    // False when a stored key can no longer be decrypted, so the UI asks to reconnect.
    postizConnected: Boolean(await getPostizKey(userId)),
  };
}

export async function getPostizKey(userId: string): Promise<string | null> {
  const s = await getSettings(userId);
  if (!s.postizKeyEnc) return null;
  try {
    return decrypt(s.postizKeyEnc, userId);
  } catch {
    return null;
  }
}

export async function updateSettings(
  user: CurrentUser,
  patch: { brandName?: string; brandVoice?: string; autopilot?: boolean; autoApprove?: boolean; postizKey?: string | null },
) {
  await getSettings(user.id);
  const plan = getPlan(user.plan);
  const set: Partial<typeof schema.settings.$inferInsert> = {};
  if (patch.brandName !== undefined) set.brandName = patch.brandName;
  if (patch.brandVoice !== undefined) set.brandVoice = patch.brandVoice;
  if (patch.autopilot !== undefined) {
    if (patch.autopilot && !plan.limits.autopilot) throw limitReached("Daily autopilot is available on Pro and Business.");
    set.autopilot = patch.autopilot;
  }
  if (patch.autoApprove !== undefined) {
    if (patch.autoApprove && plan.id !== "business") throw limitReached("Auto-approve is available on Business.");
    set.autoApprove = patch.autoApprove;
  }
  if (patch.postizKey !== undefined) {
    if (patch.postizKey === null || patch.postizKey === "") set.postizKeyEnc = null;
    else {
      // Verify the key works before storing it.
      await listChannels(patch.postizKey);
      set.postizKeyEnc = encrypt(patch.postizKey, user.id);
    }
  }
  if (Object.keys(set).length === 0) throw badRequest("Nothing to update.");
  await db.update(schema.settings).set(set).where(eq(schema.settings.userId, user.id));
  return publicSettings(user.id);
}
