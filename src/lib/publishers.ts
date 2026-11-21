import * as buffer from "./buffer";
import * as postiz from "./postiz";

/** The services that can publish posts to a creator's social accounts. */
export type PublisherKind = "buffer" | "postiz";

export type PublisherChannel = { id: string; name: string; identifier: string; disabled?: boolean };
export type ScheduleInput = { integrationId: string; identifier: string; content: string; date: Date };
export type PublisherAuth = { kind: PublisherKind; key: string };

export const PUBLISHERS: Record<PublisherKind, { name: string; summary: string; keyHelp: string }> = {
  buffer: {
    name: "Buffer",
    summary: "Free for up to 3 channels. Publishes text posts to X, LinkedIn, Facebook, Threads, Bluesky, Mastodon and Google Business.",
    keyHelp: "In Buffer open Settings → API (publish.buffer.com/settings/api) and create a key.",
  },
  postiz: {
    name: "Postiz",
    summary: "Paid cloud plans, or free if you host it yourself. Connects to 28+ networks.",
    keyHelp: "In Postiz open Settings → Developers → Public API and copy the key.",
  },
};

export const isPublisher = (v: unknown): v is PublisherKind => v === "buffer" || v === "postiz";

const impl = { buffer, postiz } as const;

export const listChannels = (auth: PublisherAuth): Promise<PublisherChannel[]> => impl[auth.kind].listChannels(auth.key);
export const schedulePost = (auth: PublisherAuth, input: ScheduleInput): Promise<{ id: string | null }> => impl[auth.kind].schedulePost(auth.key, input);
