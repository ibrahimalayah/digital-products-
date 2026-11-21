import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { dbReady } from "@/db";

type Handlers = ReturnType<typeof toNextJsHandler>;
let handlers: Handlers | null = null;
const get = () => (handlers ??= toNextJsHandler(getAuth()));

function clientIp(req: Request) {
  // Vercel sets these at the edge; clients cannot spoof them there.
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Sign-in and sign-up limits enforced in Postgres, so they hold across
 * serverless instances: per IP, and per targeted email address.
 */
async function guard(req: Request) {
  const path = new URL(req.url).pathname;
  const signIn = path.endsWith("/sign-in/email");
  const signUp = path.endsWith("/sign-up/email");
  if (!signIn && !signUp) return;
  const ip = clientIp(req);
  await rateLimit(`auth-ip:${ip}`, 20, 300);
  if (signUp) await rateLimit(`signup-ip:${ip}`, 5, 3600);
  const body = (await req.clone().json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  if (email) await rateLimit(`auth-email:${email}`, 8, 600);
}

export async function GET(req: Request) {
  await dbReady();
  return get().GET(req);
}

export async function POST(req: Request) {
  await dbReady();
  try {
    await guard(req);
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ code: e.code, message: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
    throw e;
  }
  return get().POST(req);
}
