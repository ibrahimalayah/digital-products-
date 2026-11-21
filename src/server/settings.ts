import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { getPlan } from "@/lib/plans";
import { badRequest, limitReached } from "@/lib/errors";
import { isPublisher, listChannels, type PublisherAuth, type PublisherKind } from "@/lib/publishers";
import type { CurrentUser } from "@/lib/session";

export async function getSettings(userId: string) {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.userId, userId)).limit(1);
  if (row) return row;
  const [created] = await db.insert(schema.settings).values({ userId }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(schema.settings).where(eq(schema.settings.userId, userId)).limit(1);
  return again;
}

/** Client-safe view: the publishing key is reduced to a boolean. */
export async function publicSettings(userId: string) {
  const s = await getSettings(userId);
  const auth = await getPublisher(userId);
  return {
    brandName: s.brandName,
    brandVoice: s.brandVoice,
    autopilot: s.autopilot,
    autoApprove: s.autoApprove,
    publisher: (isPublisher(s.publisher) ? s.publisher : "buffer") as PublisherKind,
    // False when a stored key can no longer be decrypted, so the UI asks to reconnect.
    publisherConnected: Boolean(auth),
  };
}

/** The creator's connected publishing service and its decrypted key, or null. */
export async function getPublisher(userId: string): Promise<PublisherAuth | null> {
  const s = await getSettings(userId);
  if (!s.publisherKeyEnc || !isPublisher(s.publisher)) return null;
  try {
    return { kind: s.publisher, key: decrypt(s.publisherKeyEnc, userId) };
  } catch {
    return null;
  }
}

export async function updateSettings(
  user: CurrentUser,
  patch: { brandName?: string; brandVoice?: string; autopilot?: boolean; autoApprove?: boolean; publisher?: PublisherKind; publisherKey?: string | null },
) {
  const current = await getSettings(user.id);
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
  if (patch.publisherKey !== undefined) {
    if (patch.publisherKey === null || patch.publisherKey === "") set.publisherKeyEnc = null;
    else {
      const kind = patch.publisher ?? (isPublisher(current.publisher) ? current.publisher : "buffer");
      // Verify the key works before storing it.
      await listChannels({ kind, key: patch.publisherKey });
      set.publisher = kind;
      set.publisherKeyEnc = encrypt(patch.publisherKey, user.id);
    }
  } else if (patch.publisher !== undefined && patch.publisher !== current.publisher) {
    // A key belongs to one service, so switching service disconnects the old key.
    set.publisher = patch.publisher;
    set.publisherKeyEnc = null;
  }
  if (Object.keys(set).length === 0) throw badRequest("Nothing to update.");
  await db.update(schema.settings).set(set).where(eq(schema.settings.userId, user.id));
  return publicSettings(user.id);
}
