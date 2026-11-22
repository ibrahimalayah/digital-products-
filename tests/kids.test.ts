import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { DRAWING_KINDS, drawingKind, isKidsProduct, makeDrawing } from "@/lib/drawings";
import { LANGUAGES, labelsFor, languageName } from "@/lib/languages";
import { blockType, finishPages } from "@/lib/ai";
import { renderProductPdf } from "@/lib/pdf";
import { createProduct, generateOutline, generateSection } from "@/server/products";
import { updateSettings } from "@/server/settings";
import { pickLanguage, siteText } from "@/lib/locale";
import { ldJson, productJsonLd, productTags } from "@/lib/seo";
import { EXAMPLES, exampleSlug, seedShowcase } from "@/server/showcase";
import { listStore } from "@/server/products";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
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
      // Each page also carries the text blocks a real page has, so some spill onto a second sheet.
      sections: [
        {
          title: "Activities",
          summary: "All drawings",
          pages: pages.map((pg) => ({
            ...pg,
            blocks: [
              { type: "paragraph" as const, title: "", text: "Read this first. ".repeat(12), items: [] },
              ...pg.blocks,
              { type: "fill" as const, title: "Your turn", text: "", items: ["What did you find?", "What will you make next?", "Who will you show?"] },
              { type: "tip" as const, title: "", text: "Take your time.", items: [] },
            ],
          })),
        },
      ],
      brand: "Kitforge",
      language: "sv",
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20_000);
    if (process.env.PDF_OUT) fs.writeFileSync(process.env.PDF_OUT, pdf);
  });
});

describe("Arabic", () => {
  it("prints a right-to-left PDF in an Arabic font, with digits and Latin words intact", async () => {
    const pdf = await renderProductPdf({
      title: "مستكشفو الفضاء: كتاب الأنشطة",
      promise: "اثنا عشر نشاطًا ممتعًا بلا شاشات.",
      audience: "أطفال من 5 إلى 8 سنوات",
      pageSize: "A4",
      accent: "#1d3f72",
      brand: "Kitforge",
      language: "ar",
      outline: { subtitle: "مغامرة ممتعة لكل طفل", welcome: "مرحبًا بك أيها المستكشف الصغير.\n\nفي نهاية هذا الكتاب سيكون لديك 12 نشاطًا مكتملًا.", howToUse: ["اطبع الصفحات.", "أحضر أقلام التلوين والمقص.", "أنجز نشاطًا واحدًا كل يوم."], sections: [], extras: ["متتبع التقدم"] },
      sections: [
        {
          title: "الاستعداد للرحلة",
          summary: "نجهّز كل ما نحتاجه قبل الإقلاع.",
          pages: [
            {
              heading: "لوّن صاروخك",
              goal: "أن تصمم صاروخًا خاصًا بك",
              blocks: [
                { type: "paragraph", title: "", text: "كل رائد فضاء يحتاج إلى صاروخ قوي. استخدم ألوانك المفضلة وزيّن صاروخك كما تشاء (PDF رقم 1).", items: [] },
                { type: "drawing", title: "صاروخي", text: "color-rocket", items: [] },
                { type: "steps", title: "افعل هذا", text: "", items: ["اختر 3 ألوان.", "لوّن جسم الصاروخ أولًا.", "أضف اسمك على الجانب."] },
                { type: "checklist", title: "قائمة التجهيز", text: "", items: ["أقلام تلوين", "مقص", "صمغ"] },
                { type: "tip", title: "", text: "جرّب تلوين النجوم بلون فضي.", items: [] },
                { type: "paragraph", title: "", text: "في Kitforge قائمة جديدة: فكرة، قصة، جائزة. إذا أحببت 3D فجرّب المكعب.", items: [] },
              ],
            },
          ],
        },
      ],
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // The Arabic font is embedded; without it the file would be far smaller.
    expect(pdf.length).toBeGreaterThan(15_000);
    if (process.env.PDF_OUT_AR) fs.writeFileSync(process.env.PDF_OUT_AR, pdf);
  });

  it("recognises Arabic children's products and Arabic as a language", () => {
    expect(isKidsProduct({ title: "كتاب أنشطة الفضاء", audience: "للأطفال من 5 إلى 8", format: "" })).toBe(true);
    expect(languageName("ar")).toBe("Arabic");
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

describe("choosing a visitor's language", () => {
  it("prefers a saved choice, then the browser's own order, then English", () => {
    expect(pickLanguage("ar", "sv-SE,sv;q=0.9")).toBe("ar");
    expect(pickLanguage(undefined, "sv-SE,sv;q=0.9,en-US;q=0.8")).toBe("sv");
    expect(pickLanguage(undefined, "en;q=0.5, fr-CA;q=0.9")).toBe("fr");
    expect(pickLanguage(undefined, "nb-NO,nb;q=0.9")).toBe("no");
    expect(pickLanguage(undefined, "ja,zh;q=0.9,ar-EG;q=0.8")).toBe("ar");
    expect(pickLanguage("xx", "ja")).toBe("en");
    expect(pickLanguage(null, null)).toBe("en");
    expect(pickLanguage(undefined, "de;q=0, it")).toBe("it");
  });

  it("has the header and headline in every language", () => {
    const keys = Object.keys(siteText("en"));
    for (const l of LANGUAGES) {
      const t = siteText(l.id);
      expect(Object.keys(t), l.id).toEqual(keys);
      expect(t.title, l.id).toHaveLength(3);
      expect(t.sub.length, l.id).toBeGreaterThan(40);
    }
  });
});

describe("search engines", () => {
  it("derives hashtags from what a product is", () => {
    expect(productTags({ title: "Sunday Meal Prep Kit", audience: "Busy parents", format: "A weekly planner and a shopping checklist" })).toEqual(["printables", "digitalproducts", "planner", "checklist", "sunday", "meal", "prep", "pdfdownload"]);
    const kids = productTags({ title: "Ocean Friends Activity Book", audience: "Kids aged 5 to 8", format: "mazes and colouring" });
    expect(kids.slice(0, 2)).toEqual(["kidsactivities", "printables"]);
    expect(kids).toContain("coloringpages");
    expect(kids.every((t) => /^[\p{L}\p{N}]+$/u.test(t))).toBe(true);
  });

  it("describes a product to search engines without letting content break out of the tag", () => {
    const data = productJsonLd({ title: "A </script> kit", promise: "p", audience: "a", format: "f", priceCents: 1250, language: "en" }, "https://example.test/store/x", "Brand");
    expect(data).toMatchObject({ "@type": "Product", offers: { price: "12.50", priceCurrency: "USD" } });
    expect(ldJson(data)).not.toContain("</script>");
  });
});

describe("example products in the store", () => {
  it("gives every example a distinct, stable address", () => {
    const slugs = EXAMPLES.map(exampleSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(exampleSlug({ title: "مستكشفو الفضاء", language: "ar" })).toMatch(/^ar-kit-[0-9a-f]{6}$/);
    expect(exampleSlug({ title: "Sunday Meal Prep Kit" })).toMatch(/^sunday-meal-prep-kit-[0-9a-f]{6}$/);
  });

  it("publishes the examples once, then hands them to the owner when there is one", async () => {
    const first = await seedShowcase();
    expect(first.added).toHaveLength(EXAMPLES.length);
    expect(first.owner).toContain("placeholder");
    const again = await seedShowcase();
    expect(again.added).toHaveLength(0);
    expect((await listStore()).length).toBeGreaterThanOrEqual(EXAMPLES.length);
    const admin = await makeUser({ role: "admin" });
    const handed = await seedShowcase();
    expect(handed.owner).toBe("site owner");
    expect(handed.movedToOwner).toBe(EXAMPLES.length);
    const rows = await db.select({ userId: schema.products.userId }).from(schema.products).where(eq(schema.products.status, "published"));
    expect(rows.every((r) => r.userId === admin.id)).toBe(true);
  });
});
