/**
 * Validates a post-login destination. Only same-origin paths are allowed;
 * anything else (other hosts, protocol-relative URLs, control characters that
 * browsers strip, backslashes) falls back to the studio.
 */
export function safeNext(next: string | null | undefined, origin = "http://localhost"): string {
  const fallback = "/app";
  if (!next || !next.startsWith("/") || /[\x00-\x1f\x7f\\]/.test(next) || next.startsWith("//")) return fallback;
  try {
    const u = new URL(next, origin);
    return u.origin === new URL(origin).origin ? u.pathname + u.search : fallback;
  } catch {
    return fallback;
  }
}
