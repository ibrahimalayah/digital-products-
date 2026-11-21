import { describe, expect, it } from "vitest";
import { decrypt, encrypt, safeEqual } from "@/lib/crypto";
import { normalisePlan } from "@/lib/ai";
import { assertSameOrigin } from "@/lib/api";
import { consume, getUsage, refund } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import { slotTimes } from "@/server/campaigns";
import { slugify } from "@/lib/utils";
import { safeNext } from "@/lib/safe-next";
import { aiGuard } from "@/lib/ai-guard";
import { makeUser } from "./helpers";

describe("crypto", () => {
  it("round-trips and rejects tampering", () => {
    const c = encrypt("postiz-key-123");
    expect(c).not.toContain("postiz-key-123");
    expect(decrypt(c)).toBe("postiz-key-123");
    const parts = c.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(parts.join("."))).toThrow();
    expect(encrypt("a")).not.toBe(encrypt("a")); // fresh IV each time
  });
  it("binds ciphertext to its owner", () => {
    const c = encrypt("key", "user_a");
    expect(decrypt(c, "user_a")).toBe("key");
    expect(() => decrypt(c, "user_b")).toThrow();
  });
  it("compares secrets in constant time", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("budget plan normalisation", () => {
  it("maps onto real channels and sums to 100", () => {
    const p = normalisePlan(
      { summary: "", cadence: "", angles: [], kpis: [], allocations: [{ channel: "X", percent: 70, rationale: "a" }, { channel: "made-up", percent: 90, rationale: "b" }] },
      ["x", "linkedin", "pinterest"],
    );
    expect(p.allocations.map((a) => a.channel)).toEqual(["x", "linkedin", "pinterest"]);
    expect(p.allocations.reduce((s, a) => s + a.percent, 0)).toBe(100);
  });
  it("splits evenly when the model returns nothing usable", () => {
    const p = normalisePlan({ summary: "", cadence: "", angles: [], kpis: [], allocations: [] }, ["x", "linkedin", "tiktok"]);
    expect(p.allocations.reduce((s, a) => s + a.percent, 0)).toBe(100);
  });
});

describe("same-origin guard", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost:3000/api/x", { method: "POST", headers });
  it("allows our own origin and non-browser clients", () => {
    expect(() => assertSameOrigin(req({ origin: "http://localhost:3000" }))).not.toThrow();
    expect(() => assertSameOrigin(req({}))).not.toThrow();
  });
  it("blocks other origins", () => {
    expect(() => assertSameOrigin(req({ origin: "https://evil.example" }))).toThrow(/Cross-site/);
    expect(() => assertSameOrigin(req({ "sec-fetch-site": "cross-site" }))).toThrow(/Cross-site/);
  });
});

describe("usage quotas", () => {
  it("stops at the plan limit, even under concurrency", async () => {
    const user = await makeUser(); // free: 3 idea runs
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => consume(user, "ideas")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect((await getUsage(user.id)).ideas).toBe(3);
    await expect(consume(user, "ideas")).rejects.toMatchObject({ status: 402 });
  });
  it("refunds failed work", async () => {
    const user = await makeUser();
    await consume(user, "products");
    await refund(user.id, "products");
    expect((await getUsage(user.id)).products).toBe(0);
    await refund(user.id, "products");
    expect((await getUsage(user.id)).products).toBe(0); // never negative
  });
});

describe("rate limiter", () => {
  it("rejects past the limit", async () => {
    await makeUser();
    const key = `t:${Math.random()}`;
    await rateLimit(key, 2, 60);
    await rateLimit(key, 2, 60);
    await expect(rateLimit(key, 2, 60)).rejects.toMatchObject({ status: 429 });
  });
});

describe("helpers", () => {
  it("schedules slots in the future, in order", () => {
    const now = new Date("2026-11-21T15:00:00Z");
    const t = slotTimes(now, 3, now);
    expect(t).toHaveLength(3);
    t.forEach((d) => expect(d.getTime()).toBeGreaterThan(now.getTime()));
    expect(t[0].getTime()).toBeLessThan(t[2].getTime());
  });
  it("slugifies hostile input", () => {
    expect(slugify("../../Etc Passwd <script>")).toBe("etc-passwd-script");
    expect(slugify("!!!")).toBe("product");
  });
});

describe("post-login redirect", () => {
  const origin = "https://app.example";
  it("keeps same-site paths", () => {
    expect(safeNext("/app/billing?upgraded=1", origin)).toBe("/app/billing?upgraded=1");
    expect(safeNext("/store/kit-abc123", origin)).toBe("/store/kit-abc123");
  });
  it("rejects every off-site form", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "javascript:alert(1)", "", null, undefined, "app"]) {
      expect(safeNext(bad as string, origin), String(bad)).toBe("/app");
    }
  });
});

describe("AI call guard", () => {
  it("stops a burst of AI calls from one account", async () => {
    const user = await makeUser();
    for (let i = 0; i < 20; i++) await aiGuard(user); // burst window allows 20 a minute
    await expect(aiGuard(user)).rejects.toMatchObject({ status: 429 });
  });
});
