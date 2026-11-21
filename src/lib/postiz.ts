import { AppError } from "./errors";

const BASE = (process.env.POSTIZ_API_URL || "https://api.postiz.com").replace(/\/$/, "");

export type PostizChannel = { id: string; name: string; identifier: string; disabled?: boolean };

async function call<T>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/public/v1${path}`, {
      ...init,
      headers: { Authorization: apiKey, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new AppError(502, "postiz_unreachable", "Could not reach Postiz. Try again shortly.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new AppError(400, "postiz_auth", "Postiz rejected the API key. Check it in Settings.");
  }
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 200);
    throw new AppError(502, "postiz_error", `Postiz returned ${res.status}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function listChannels(apiKey: string): Promise<PostizChannel[]> {
  const raw = await call<unknown>(apiKey, "/integrations");
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((c) => c as Record<string, unknown>)
    .filter((c) => typeof c.id === "string")
    .map((c) => ({
      id: String(c.id),
      name: String(c.name ?? c.identifier ?? "Channel"),
      identifier: String(c.identifier ?? "unknown"),
      disabled: Boolean(c.disabled),
    }));
}

export async function schedulePost(
  apiKey: string,
  input: { integrationId: string; identifier: string; content: string; date: Date },
): Promise<{ id: string | null }> {
  const now = Date.now();
  const type = input.date.getTime() <= now + 60_000 ? "now" : "schedule";
  const settings: Record<string, unknown> = { __type: input.identifier };
  if (input.identifier === "x") settings.who_can_reply_post = "everyone";
  const raw = await call<unknown>(apiKey, "/posts", {
    method: "POST",
    body: JSON.stringify({
      type,
      date: input.date.toISOString(),
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: input.integrationId },
          value: [{ content: input.content, image: [] }],
          settings,
        },
      ],
    }),
  });
  const first = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : (raw as Record<string, unknown>);
  const id = first && (first.postId ?? first.id);
  return { id: typeof id === "string" ? id : null };
}
