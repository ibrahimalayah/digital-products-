import { AppError } from "./errors";
import type { PublisherChannel, ScheduleInput } from "./publishers";

// Buffer's GraphQL API (https://developers.buffer.com). A personal API key,
// available on Buffer's free plan, publishes to the key owner's own channels.
const ENDPOINT = (process.env.BUFFER_API_URL || "https://api.buffer.com").replace(/\/$/, "");

// Networks that accept a plain text post. The others need an image, a video or
// extra details (a Pinterest board, a YouTube title) that this app does not send.
const TEXT_SERVICES = new Set(["twitter", "linkedin", "facebook", "threads", "bluesky", "mastodon", "googlebusiness"]);

const badKey = () => new AppError(400, "publisher_auth", "Buffer rejected the API key. Create a new one at publish.buffer.com/settings/api and paste it in Settings.");
const rateLimited = () => new AppError(429, "publisher_rate_limit", "Buffer's request limit was reached. Try again in a few minutes.");

type GqlError = { message?: string; extensions?: { code?: string } };

async function gql<T>(apiKey: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new AppError(502, "publisher_unreachable", "Could not reach Buffer. Try again shortly.");
  }
  if (res.status === 401 || res.status === 403) throw badKey();
  if (res.status === 429) throw rateLimited();
  const json = (await res.json().catch(() => null)) as { data?: T; errors?: GqlError[] } | null;
  const first = json?.errors?.[0];
  if (first) {
    const code = first.extensions?.code;
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN") throw badKey();
    if (code === "RATE_LIMIT_EXCEEDED") throw rateLimited();
    throw new AppError(502, "publisher_error", `Buffer said: ${(first.message ?? "request failed").slice(0, 200)}`);
  }
  if (!res.ok || !json?.data) throw new AppError(502, "publisher_error", `Buffer returned ${res.status}.`);
  return json.data;
}

export async function listChannels(apiKey: string): Promise<PublisherChannel[]> {
  const orgs = await gql<{ account: { organizations: { id: string }[] } }>(apiKey, "query { account { organizations { id } } }");
  const out: PublisherChannel[] = [];
  for (const org of (orgs.account?.organizations ?? []).slice(0, 5)) {
    const data = await gql<{ channels: { id: string; name: string | null; displayName: string | null; service: string; isLocked: boolean; isDisconnected: boolean }[] }>(
      apiKey,
      "query Channels($input: ChannelsInput!) { channels(input: $input) { id name displayName service isLocked isDisconnected } }",
      { input: { organizationId: org.id } },
    );
    for (const c of data.channels ?? []) {
      const service = String(c.service ?? "").toLowerCase();
      out.push({
        id: c.id,
        name: c.displayName || c.name || service,
        identifier: service,
        disabled: Boolean(c.isLocked || c.isDisconnected) || !TEXT_SERVICES.has(service),
      });
    }
  }
  return out;
}

const CREATE = `mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}`;

type CreateResult = { createPost: { post?: { id: string }; message?: string } };

export async function schedulePost(apiKey: string, input: ScheduleInput): Promise<{ id: string | null }> {
  const now = input.date.getTime() <= Date.now() + 60_000;
  const base = {
    channelId: input.integrationId,
    text: input.content,
    schedulingType: "automatic",
    ...(now ? { mode: "shareNow" } : { mode: "customScheduled", dueAt: input.date.toISOString() }),
  };
  let data: CreateResult;
  try {
    data = await gql<CreateResult>(apiKey, CREATE, { input: { ...base, assets: [], needsApproval: false } });
  } catch (e) {
    // Buffer's reference and its examples disagree on whether `assets` and
    // `needsApproval` are accepted. A schema rejection creates nothing, so it
    // is safe to send the minimal form once.
    if (!(e instanceof AppError && e.code === "publisher_error" && /assets|needsApproval|CreatePostInput|not defined|Unknown|Variable/i.test(e.message))) throw e;
    data = await gql<CreateResult>(apiKey, CREATE, { input: base });
  }
  const result = data.createPost;
  if (!result?.post?.id) throw new AppError(502, "publisher_error", `Buffer did not accept the post: ${(result?.message ?? "no reason given").slice(0, 200)}`);
  return { id: result.post.id };
}
