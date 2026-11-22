import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, set: () => undefined }) }));

// Every route that is intentionally reachable without a session, and why.
const PUBLIC = new Map([
  ["auth/[...all]", "Better Auth's own endpoints"],
  ["stripe/webhook", "verified by Stripe signature"],
  ["cron/daily", "verified by CRON_SECRET"],
  ["health", "liveness probe, returns no data"],
  ["leads/subscribe", "public lead form: same-origin, rate-limited, consent required, reveals nothing"],
]);

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) routeFiles(p, out);
    else if (e.name === "route.ts") out.push(p);
  }
  return out;
}

const apiDir = path.resolve(import.meta.dirname, "../src/app/api");
const routes = routeFiles(apiDir).map((file) => ({ file, name: path.relative(apiDir, path.dirname(file)) }));

describe("every API route rejects anonymous callers", () => {
  it("finds the routes", () => expect(routes.length).toBeGreaterThan(15));

  for (const { file, name } of routes) {
    if (PUBLIC.has(name)) continue;
    it(`/api/${name}`, async () => {
      const mod = (await import(file)) as Record<string, (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>>;
      const methods = ["GET", "POST", "PATCH", "DELETE"].filter((m) => typeof mod[m] === "function");
      expect(methods.length).toBeGreaterThan(0);
      for (const method of methods) {
        const req = new Request(`http://localhost:3000/api/${name}`, {
          method,
          headers: { "content-type": "application/json", origin: "http://localhost:3000" },
          body: method === "GET" ? undefined : "{}",
        });
        const res = await mod[method](req, { params: Promise.resolve({ id: "anything" }) });
        expect(res.status, `${method} /api/${name}`).toBe(401);
      }
    });
  }
});

describe("cross-site writes are blocked before auth", () => {
  it("returns 403 for a foreign Origin", async () => {
    const { POST } = await import("@/app/api/products/route");
    const res = await POST(new Request("http://localhost:3000/api/products", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" }), { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });
});
