import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createProduct } from "@/server/products";
import { createVideo, deleteVideo, getVideo, listVideos, updateVideo } from "@/server/videos";
import { blockType, normaliseVideo, wordsFor } from "@/lib/ai";
import { chainProviders, completeJson, waitSeconds } from "@/lib/ai-chain";
import { envelope, mix, sceneAt, timeline } from "@/lib/video-render";
import { getUsage } from "@/lib/usage";
import { addLead, countLeads, deleteLead, leadsCsv, listLeads } from "@/server/leads";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { makeUser } from "./helpers";

const brief = { title: "Puppy Potty Plan", promise: "A calm, house-trained puppy in 28 days.", audience: "New puppy owners", format: "4 weekly guides and a tracker" };
const input = (productId: string) => ({ productId, seconds: 30, goal: "leads" as const, voice: "af_heart" });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("lead videos", () => {
  it("writes a script for the owner's product and counts usage", async () => {
    const user = await makeUser();
    const p = await createProduct(user, brief);
    const v = await createVideo(user, input(p.id));
    expect(v.script.scenes.length).toBeGreaterThanOrEqual(2);
    expect(v.script.hashtags.every((h) => /^#\w+$/.test(h))).toBe(true);
    expect((await getUsage(user.id)).videos).toBe(1);
    expect(await listVideos(user.id)).toHaveLength(1);
  });

  it("keeps videos private to their owner", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const p = await createProduct(a, brief);
    const v = await createVideo(a, input(p.id));
    await expect(getVideo(b.id, v.id)).rejects.toMatchObject({ status: 404 });
    await expect(createVideo(b, input(p.id))).rejects.toMatchObject({ status: 404 });
    await expect(updateVideo(b.id, v.id, { voice: "none" })).rejects.toMatchObject({ status: 404 });
    await deleteVideo(b.id, v.id);
    expect(await listVideos(a.id)).toHaveLength(1);
    expect((await getUsage(b.id)).videos).toBe(0);
  });

  it("stops at the plan's monthly limit", async () => {
    const user = await makeUser(); // Starter: 2 a month
    const p = await createProduct(user, brief);
    await createVideo(user, input(p.id));
    await createVideo(user, input(p.id));
    await expect(createVideo(user, input(p.id))).rejects.toMatchObject({ status: 402 });
  });

  it("saves edits to the script and voice", async () => {
    const user = await makeUser();
    const p = await createProduct(user, brief);
    const v = await createVideo(user, input(p.id));
    const scenes = [
      { caption: "New hook", narration: "A new first line." },
      { caption: "Tap the link", narration: "Tap the link to get it." },
    ];
    const next = await updateVideo(user.id, v.id, { scenes, voice: "none" });
    expect(next.script.scenes).toEqual(scenes);
    expect(next.script.description).toBe(v.script.description);
    expect(next.voice).toBe("none");
  });
});

describe("script clean-up", () => {
  it("makes lines speakable and captions short", () => {
    const out = normaliseVideo(
      {
        title: "t",
        scenes: [
          { caption: "Stop overpaying for subscriptions you forgot about every single month of the year.", narration: "Go to https://example.com/x now! #ad **Really**." },
          { caption: "", narration: "" },
          { caption: "", narration: "Only a spoken line." },
        ],
        description: "  Two   spaces. ",
        hashtags: ["#Budget Tips", "budgettips", "#BudgetTips", "money!"],
      },
      30,
    );
    expect(out.scenes).toHaveLength(2);
    expect(out.scenes[0].narration).toBe("Go to the link now! Really.");
    expect(out.scenes[0].caption.length).toBeLessThanOrEqual(60);
    expect(out.scenes[1].caption).toBe("Only a spoken line");
    expect(out.description).toBe("Two spaces.");
    expect(out.hashtags).toEqual(["#BudgetTips", "#budgettips", "#money"]);
  });

  it("cuts a script that is far too long from the middle", () => {
    const long = "word ".repeat(60).trim();
    const scenes = ["hook", "a", "b", "c", "cta"].map((caption) => ({ caption, narration: long }));
    const out = normaliseVideo({ title: "t", scenes, description: "", hashtags: [] }, 15);
    expect(wordsFor(15)).toBe(33);
    expect(out.scenes.length).toBe(3);
    expect(out.scenes[0].caption).toBe("hook");
    expect(out.scenes.at(-1)!.caption).toBe("cta");
  });
});

describe("section clean-up", () => {
  it("maps invented block types onto ones the PDF can draw", () => {
    expect(blockType("Checklist", true)).toBe("checklist");
    expect(blockType("numbered_steps", true)).toBe("steps");
    expect(blockType("reflection questions", true)).toBe("fill");
    expect(blockType("email template", false)).toBe("template");
    expect(blockType("pro tip", false)).toBe("tip");
    expect(blockType("list", true)).toBe("checklist");
    expect(blockType("intro", false)).toBe("paragraph");
  });
});

describe("video timing", () => {
  const scenes = [
    { caption: "One", narration: "one two three four five six seven eight" },
    { caption: "Two", narration: "short" },
  ];

  it("paces silent scenes for reading and voiced scenes by the audio", () => {
    const silent = timeline(scenes, [null, null]);
    expect(silent.durs[1]).toBe(2.2);
    expect(silent.total).toBeCloseTo(silent.durs[0] + 2.2);
    const clip = { samples: new Float32Array(24_000 * 3).fill(0.5), rate: 24_000 };
    const voiced = timeline(scenes, [clip, null]);
    expect(voiced.durs[0]).toBeCloseTo(3.4);
    expect(sceneAt(voiced, 0)).toBe(0);
    expect(sceneAt(voiced, 3.5)).toBe(1);
    expect(sceneAt(voiced, 99)).toBe(1);
  });

  it("mixes clips at their scene starts and measures loudness", () => {
    const clip = { samples: new Float32Array(24_000).fill(0.5), rate: 24_000 };
    const tl = timeline(scenes, [null, clip]);
    expect(mix([null, null], tl)).toBeNull();
    const track = mix([null, clip], tl)!;
    const at = Math.floor((tl.starts[1] + 0.12) * 24_000);
    expect(track.samples[at - 1]).toBe(0);
    expect(track.samples[at]).toBe(0.5);
    const env = envelope(track.samples, track.rate);
    expect(Math.max(...env)).toBeCloseTo(1);
    expect(env[0]).toBe(0);
  });
});

describe("Hugging Face provider", () => {
  it("joins the chain when a token is set and calls the router with it", async () => {
    vi.stubEnv("HF_TOKEN", "hf_test");
    const hf = chainProviders().find((p) => p.name === "huggingface")!;
    expect(hf).toMatchObject({ baseUrl: "https://router.huggingface.co/v1", model: "openai/gpt-oss-120b:fastest" });
    let seen = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        seen = `${url} ${new Headers(init?.headers).get("authorization")}`;
        return Response.json({ choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }] });
      }),
    );
    const out = await completeJson(z.object({ ok: z.boolean() }), "s", "p", 100, [hf]);
    expect(out).toMatchObject({ ok: true, provider: "huggingface" });
    expect(seen).toBe("https://router.huggingface.co/v1/chat/completions Bearer hf_test");
  });
});

describe("keyless last resort", () => {
  const schema = z.object({ ok: z.boolean() });

  it("is off in tests, last in production, and gives way to a paid key", () => {
    expect(chainProviders().some((p) => p.name === "keyless")).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GROQ_API_KEY", "g");
    expect(chainProviders().map((p) => p.name).at(-1)).toBe("keyless");
    vi.stubEnv("AI_KEYLESS", "0");
    expect(chainProviders().some((p) => p.name === "keyless")).toBe(false);
    vi.stubEnv("AI_KEYLESS", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "a");
    expect(chainProviders().some((p) => p.name === "keyless")).toBe(false);
  });

  it("reads the wait out of a rate-limit reply", () => {
    expect(waitSeconds("Free limit reached: 1 reply every 45 seconds per IP. Please wait 41 seconds or")).toBe(41);
    expect(waitSeconds('{"error":{"message":"Free limit reached: 1 reply every 45 seconds per IP. Retry after 34s, or get"}}')).toBe(34);
    expect(waitSeconds("nope")).toBeNull();
  });

  it("sends no key, waits when told to, then answers", async () => {
    const seen: (string | null)[] = [];
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL, init?: RequestInit) => {
        seen.push(new Headers(init?.headers).get("authorization"));
        if (n++ === 0) return new Response("Please wait 0 seconds", { status: 402 });
        return Response.json({ choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }] });
      }),
    );
    const out = await completeJson(schema, "s", "p", 100, [{ name: "keyless", baseUrl: "https://keyless.test", key: "", model: "m" }]);
    expect(out).toMatchObject({ ok: true, provider: "keyless" });
    expect(seen).toEqual([null, null]);
  });
});

describe("leads", () => {
  it("collects emails for published products only, once each, for the owner alone", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const p = await createProduct(owner, brief);
    await addLead(p.id, "Early@Example.test"); // not published yet
    expect(await countLeads(owner.id)).toBe(0);
    await db.update(schema.products).set({ status: "published" }).where(eq(schema.products.id, p.id));
    await addLead(p.id, "Fan@Example.test");
    await addLead(p.id, "fan@example.test");
    await addLead("no-such-product", "x@example.test");
    const rows = await listLeads(owner.id);
    expect(rows.map((r) => r.email)).toEqual(["fan@example.test"]);
    expect(await listLeads(other.id)).toHaveLength(0);
    await deleteLead(other.id, rows[0].id);
    expect(await countLeads(owner.id)).toBe(1);
    await deleteLead(owner.id, rows[0].id);
    expect(await countLeads(owner.id)).toBe(0);
  });

  it("writes a CSV that a spreadsheet cannot run as a formula", () => {
    const csv = leadsCsv([{ id: "1", email: "=cmd@example.test", productTitle: 'The "Big" Kit', createdAt: new Date("2026-11-22T10:00:00Z") }]);
    expect(csv).toBe('email,product,signed_up\r\n"\'=cmd@example.test","The ""Big"" Kit","2026-11-22T10:00:00.000Z"\r\n');
  });
});
