"use client";
import { msg } from "./i18n";

// Shown when the server gave no message of its own. Components pass the result
// of errorMessage() through t(), which translates this and leaves server text as is.
const FALLBACK = msg("Something went wrong. Try again.");

/** Calls our JSON API and throws an Error carrying the server's message. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? FALLBACK);
  return json as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : FALLBACK);
