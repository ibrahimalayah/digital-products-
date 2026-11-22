import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, badRequest, forbidden, msg } from "./errors";
import { getT } from "./i18n-server";
import { dbReady } from "@/db";
import { appUrl } from "./env";

type Ctx<P> = { params: Promise<P> };

/**
 * Wraps a route handler: waits for the database, blocks cross-site writes,
 * and turns thrown errors into consistent JSON without leaking internals.
 */
export function route<P = Record<string, string>>(
  fn: (req: Request, params: P) => Promise<Response | object>,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      await dbReady();
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) assertSameOrigin(req);
      const out = await fn(req, await ctx.params);
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      // The one place error text is put into the visitor's language: errors carry
      // their English sentence (marked with msg() where thrown) plus placeholders.
      const t = await getT();
      if (e instanceof AppError) {
        return NextResponse.json({ error: { code: e.code, message: e.localized(t) } }, { status: e.status });
      }
      if (e instanceof z.ZodError) {
        const first = e.issues[0];
        const where = first?.path.length ? `${first.path.join(".")}: ` : "";
        // A schema's own message translates when it was marked with msg(); zod's built-in ones stay English.
        const what = first ? t(first.message) : t("Invalid input.");
        return NextResponse.json({ error: { code: "invalid_input", message: `${where}${what}` } }, { status: 400 });
      }
      console.error("[api]", req.method, new URL(req.url).pathname, e);
      return NextResponse.json(
        { error: { code: "server_error", message: t("Something went wrong on our side. Try again.") } },
        { status: 500 },
      );
    }
  };
}

/** CSRF defence in depth on top of SameSite cookies: writes must come from our own origin. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser clients send no Origin; browsers always do on cross-site writes.
    if (req.headers.get("sec-fetch-site") === "cross-site") throw forbidden(msg("Cross-site request blocked."));
    return;
  }
  const allowed = new Set([new URL(appUrl()).origin, new URL(req.url).origin]);
  if (!allowed.has(origin)) throw forbidden(msg("Cross-site request blocked."));
}

export async function body<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw badRequest(msg("Request body must be JSON."));
  }
  return schema.parse(json);
}
