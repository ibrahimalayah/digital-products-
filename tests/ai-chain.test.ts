import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { chainProviders, completeJson, extractJson, type ChainProvider } from "@/lib/ai-chain";
import { AI_SCHEMAS, writeSection } from "@/lib/ai";

const schema = z.object({ ideas: z.array(z.object({ title: z.string() })) });
const good = JSON.stringify({ ideas: [{ title: "Budget planner" }] });
const provider = (name: ChainProvider["name"]): ChainProvider => ({ name, baseUrl: `https://${name}.test/v1`, key: `${name}-key`, model: "m" });
const reply = (content: string, finish = "stop") => Response.json({ choices: [{ finish_reason: finish, message: { content } }] });

function mockFetch(handler: (url: string, body: Record<string, unknown>, auth: string | null) => Response | Promise<Response>) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      calls.push({ url: String(url), body });
      return handler(String(url), body, new Headers(init?.headers).get("authorization"));
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("free-tier AI chain", () => {
  it("builds providers from the same variable names Rekrutify uses, in order", () => {
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GEMINI_API_KEY", "ge");
    vi.stubEnv("OPENROUTER_API_KEY", "o");
    vi.stubEnv("FREELLMAPI_BASE_URL", "http://localhost:3001/v1/");
    vi.stubEnv("FREELLMAPI_API_KEY", "f");
    expect(chainProviders().map((p) => p.name)).toEqual(["freellmapi", "groq", "google", "openrouter"]);
    expect(chainProviders()[0].baseUrl).toBe("http://localhost:3001/v1");
  });

  it("returns nothing-configured when no key is set", async () => {
    expect(await completeJson(schema, "s", "p", 100, [])).toEqual({ ok: false, reason: "none_configured" });
  });

  it("uses the first provider that answers with valid JSON", async () => {
    const calls = mockFetch((_u, _b, auth) => {
      expect(auth).toBe("Bearer groq-key");
      return reply(good);
    });
    const r = await completeJson(schema, "sys", "prompt", 500, [provider("groq"), provider("google")]);
    expect(r).toEqual({ ok: true, value: { ideas: [{ title: "Budget planner" }] }, provider: "groq" });
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ response_format: { type: "json_object" }, max_tokens: 500 + 4096 });
    expect(String((calls[0].body.messages as { content: string }[])[0].content)).toContain('"ideas"');
  });

  it("fails over on errors, empty replies, cut-off replies and wrong shapes", async () => {
    const calls = mockFetch((url) => {
      if (url.includes("groq")) return new Response("rate limited", { status: 429 });
      if (url.includes("google")) return reply("", "stop");
      if (url.includes("openrouter")) return reply('{"ideas": [{"title": "half', "length");
      return reply(JSON.stringify({ wrong: true }));
    });
    const r = await completeJson(schema, "s", "p", 100, [provider("groq"), provider("google"), provider("openrouter"), provider("openai")]);
    expect(r).toEqual({ ok: false, reason: "all_failed" });
    expect(calls.map((c) => new URL(c.url).hostname)).toEqual(["groq.test", "google.test", "openrouter.test", "openai.test"]);
  });

  it("falls through to a later provider that works", async () => {
    mockFetch((url) => (url.includes("groq") ? new Response("down", { status: 503 }) : reply("```json\n" + good + "\n```")));
    const r = await completeJson(schema, "s", "p", 100, [provider("groq"), provider("google")]);
    expect(r).toMatchObject({ ok: true, provider: "google" });
  });

  it("retries once without response_format when a router rejects it", async () => {
    const calls = mockFetch((_u, body) => ("response_format" in body ? new Response("unsupported", { status: 400 }) : reply(good)));
    const r = await completeJson(schema, "s", "p", 100, [provider("openrouter")]);
    expect(r).toMatchObject({ ok: true, provider: "openrouter" });
    expect(calls).toHaveLength(2);
  });

  it("gives the local router a second attempt", async () => {
    let n = 0;
    const calls = mockFetch(() => (++n === 1 ? new Response("busy", { status: 502 }) : reply(good)));
    expect(await completeJson(schema, "s", "p", 100, [provider("freellmapi")])).toMatchObject({ ok: true, provider: "freellmapi" });
    expect(calls).toHaveLength(2);
  });

  it("extracts JSON from fenced or chatty replies", () => {
    expect(extractJson('Here you go:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! {"a": {"b": 2}} Hope that helps.')).toEqual({ a: { b: 2 } });
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("agent schemas over the chain", () => {
  it("can express every agent schema as JSON Schema", () => {
    for (const [name, schema] of Object.entries(AI_SCHEMAS())) {
      expect(() => z.toJSONSchema(schema), name).not.toThrow();
    }
  });

  it("writes a section through the chain and fills in fields the model left out", async () => {
    vi.stubEnv("AI_MOCK", "0");
    vi.stubEnv("GROQ_API_KEY", "g");
    mockFetch(() =>
      reply(
        JSON.stringify({
          pages: [
            {
              heading: "Know your numbers",
              goal: "Write down what you earn.",
              blocks: [
                { type: "paragraph", text: "Start with your payslip." },
                { type: "steps", title: "Do this", items: ["Open your banking app.", "Write the figure down."] },
                { type: "tip", text: null, items: null },
              ],
            },
          ],
        }),
      ),
    );
    const outline = { subtitle: "", welcome: "", howToUse: [], sections: [{ title: "Start", summary: "Begin.", pageTitles: ["Know your numbers"] }], extras: [] };
    const section = await writeSection({ title: "T", promise: "P", audience: "A", format: "F", tone: "warm" }, outline, 0);
    expect(section.pages[0].blocks).toEqual([
      { type: "paragraph", title: "", text: "Start with your payslip.", items: [] },
      { type: "steps", title: "Do this", text: "", items: ["Open your banking app.", "Write the figure down."] },
    ]);
  });
});
