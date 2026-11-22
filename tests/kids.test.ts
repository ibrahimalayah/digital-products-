import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { DRAWING_KINDS, drawingKind, isKidsProduct, makeDrawing } from "@/lib/drawings";
import { LANGUAGES, labelsFor, languageName } from "@/lib/languages";
import { blockType, finishPages } from "@/lib/ai";
import { renderProductPdf } from "@/lib/pdf";
import { createProduct, generateOutline, generateSection } from "@/server/products";
import { updateSettings } from "@/server/settings";
import { makeUser } from "./helpers";

describe("children's drawings", () => {
  it("builds every drawing inside its frame", () => {
    for (const kind of DRAWING_KINDS) {
      const d = makeDrawing(kind, "seed");
      expect(d.shapes.length, kind).toBeGreaterThan(5);
      const pts = d.shapes.flatMap((s) => (s.t === "line" ? [s.a, s.b] : s.t === "poly" ? s.pts : s.t === "ellipse" ? [s.c] : [s.at]));
      for (const [x, y] of pts) {
        expect(x, kind).toBeGreaterThanOrEqual(0);
        expect(x, kind).toBeLessThanOrEqual(d.w);
        expect(y, kind).toBeGreaterThanOrEqual(0);
        expect(y, kind).toBeLessThanOrEqual(d.h);
      }
    }
  });

  it("makes the same maze for the same page and a different one for another", () => {
    const a = JSON.stringify(makeDrawing("maze", "Page one").shapes);
    expect(JSON.stringify(makeDrawing("maze", "Page one").shapes)).toBe(a);
    expect(JSON.stringify(makeDrawing("maze", "Page two").shapes)).not.toBe(a);
  });

  it("gives a paper cube six faces, seven tabs and 21 pips", () => {
    const d = makeDrawing("net-cube");
    expect(d.shapes.filter((s) => s.t === "poly" && !s.open).length).toBe(6);
    expect(d.shapes.filter((s) => s.t === "poly" && s.open).length).toBe(7);
    expect(d.shapes.filter((s) => s.t === "ellipse").length).toBe(21);
  });

  it("understands what a model meant", () => {
    expect(drawingKind("net-house")).toBe("net-house");
    expect(drawingKind("A fun maze!")).toBe("maze");
    expect(drawingKind("dot to dot rocket")).toBe("dots-rocket");
    expect(drawingKind("paper dice to cut and glue")).toBe("net-cube");
    expect(drawingKind("colouring page: castle")).toBe("color-castle");
    expect(drawingKind("learn to draw a 3D cylinder")).toBe("draw-cylinder");
    expect(DRAWING_KINDS).toContain(drawingKind("", 7));
    expect(blockType("coloring activity", false)).toBe("drawing");
  });

  it("recognises children's products in several languages", () => {
    const p = (title: string, audience = "", format = "") => ({ title, audience, format });
    expect(isKidsProduct(p("Space Activity Book", "Kids aged 5 to 8"))).toBe(true);
    expect(isKidsProduct(p("Cuaderno del espacio", "Niños de 5 a 8 años"))).toBe(true);
    expect(isKidsProduct(p("Rymdboken", "Barn 5 till 8 år"))).toBe(true);
    expect(isKidsProduct(p("Budget Planner", "Adults with debt", "10 worksheets"))).toBe(false);
  });

  it("puts exactly one drawing, each different, on every kids' page and none elsewhere", () => {
    const raw = [
      { heading: "A", goal: null, blocks: [{ type: "paragraph", text: "Hi." }, { type: "drawing", text: "maze" }, { type: "drawing", text: "maze" }] },
      { heading: "B", blocks: [{ type: "paragraph", text: "Hi." }] },
      { heading: "C", blocks: [{ type: "maze", title: "Find the rocket" }] },
    ];
    const kids = finishPages(raw, true, 0);
    const kinds = kids.map((p) => p.blocks.filter((b) => b.type === "drawing").map((b) => b.text));
    expect(kinds.every((k) => k.length === 1)).toBe(true);
    expect(new Set(kinds.flat()).size).toBe(3);
    expect(kinds[0]).toEqual(["maze"]);
    expect(kids[0].goal).toBe("");
    const adults = finishPages(raw, false, 0);
    expect(adults.flatMap((p) => p.blocks).some((b) => b.type === "drawing")).toBe(false);
  });

  it("prints every drawing in a PDF, with labels in the product's language", async () => {
    const pages = DRAWING_KINDS.map((kind) => ({ heading: kind, goal: "", blocks: [{ type: "drawing" as const, title: `Activity: ${kind}`, text: kind, items: [] }] }));
    const pdf = await renderProductPdf({
      title: "Space Explorers Activity Book",
      promise: "Screen-free fun.",
      audience: "Kids aged 5 to 8",
      pageSize: "A4",
      accent: "#1d3f72",
      outline: null,
      // Real sections hold at most six pages, so the drawings are spread over three.
      sections: [0, 5, 10].map((from, n) => ({ title: `Activities ${n + 1}`, summary: "Drawings", pages: pages.slice(from, from + 5) })),
      brand: "Kitforge",
      language: "sv",
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20_000);
    if (process.env.PDF_OUT) fs.writeFileSync(process.env.PDF_OUT, pdf);
  });
});

describe("languages", () => {
  it("has a full set of printed labels for every language", () => {
    const keys = Object.keys(labelsFor("en"));
    for (const l of LANGUAGES) {
      const labels = labelsFor(l.id);
      expect(Object.keys(labels), l.id).toEqual(keys);
      expect(Object.values(labels).every((v) => v.trim().length > 1), l.id).toBe(true);
    }
    expect(labelsFor("xx")).toBe(labelsFor("en"));
    expect(languageName("sv")).toBe("Swedish");
    expect(languageName("xx")).toBe("English");
  });

  it("gives a new product the owner's language and a kids' product its drawings", async () => {
    const user = await makeUser();
    await updateSettings(user, { language: "es" });
    const p = await createProduct(user, { title: "Cuaderno del espacio", promise: "Diversión sin pantallas.", audience: "Niños de 5 a 8 años", format: "12 actividades" });
    expect(p.language).toBe("es");
    const outlined = await generateOutline(user, p.id);
    const done = await generateSection(user, outlined.id, 0);
    const blocks = done.sections[0].pages.flatMap((pg) => pg.blocks);
    expect(blocks.filter((b) => b.type === "drawing").length).toBe(done.sections[0].pages.length);
  });
});
