import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { DICTS } from "@/i18n";
import { fill, makeT } from "@/lib/i18n";
import { LANGUAGE_IDS } from "@/lib/languages";

const root = path.resolve(__dirname, "..");
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const edges = (s: string) => [s.match(/^\s*/)![0], s.match(/\s*$/)![0]].join("|");

let keys: string[] = [];

beforeAll(() => {
  // Collect the interface texts from the source again, so a new text without a translation fails here.
  execFileSync("node", [path.join(root, "scripts/i18n-extract.mjs")], { stdio: "pipe" });
  keys = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/keys.json"), "utf8"));
});

describe("interface translations", () => {
  it("finds the interface texts", () => {
    expect(keys.length).toBeGreaterThan(500);
  });

  for (const lang of LANGUAGE_IDS.filter((l) => l !== "en")) {
    it(`${lang} has every text, with the same placeholders and spacing`, () => {
      const dict = DICTS[lang];
      const missing = keys.filter((k) => !dict[k]?.trim());
      expect(missing.slice(0, 10), `${missing.length} texts have no ${lang} translation`).toEqual([]);
      const wrong = keys.filter((k) => placeholders(dict[k]) !== placeholders(k) || edges(dict[k]) !== edges(k));
      expect(wrong.slice(0, 10), "placeholders or leading/trailing spaces differ").toEqual([]);
    });
  }

  it("fills placeholders and falls back to English", () => {
    expect(fill("{n} pages", { n: 3 })).toBe("3 pages");
    expect(makeT({ Hello: "Hej" })("Hello")).toBe("Hej");
    expect(makeT({})("Hello {name}", { name: "Ada" })).toBe("Hello Ada");
  });
});
