import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { authSecret } from "./env";
import { notConfigured } from "./errors";

// AES-256-GCM for secrets stored at rest (creator Postiz API keys).
// Production requires its own ENCRYPTION_KEY so that rotating the session
// secret never makes stored keys unreadable. Development falls back.
function key() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === "production") throw notConfigured("ENCRYPTION_KEY is not set on this deployment, so API keys cannot be stored yet.");
    return createHash("sha256").update(`kitforge:enc:${authSecret()}`).digest();
  }
  return createHash("sha256").update(`kitforge:enc:${raw}`).digest();
}

/** `context` (the owner's user id) is bound into the ciphertext, so it cannot be moved between accounts. */
export function encrypt(plain: string, context = ""): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(payload: string, context = ""): string {
  const [v, iv, tag, data] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
