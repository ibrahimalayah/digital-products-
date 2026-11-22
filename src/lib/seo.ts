// What search engines and social networks read: keywords, hashtags and
// structured data (schema.org) for the site and for each product.
import { isKidsProduct } from "./drawings";

export const SITE_KEYWORDS = [
  "digital products",
  "printable digital products",
  "AI digital product generator",
  "printable planner",
  "printable PDF templates",
  "kids activity book printable",
  "sell digital products",
  "digital product ideas",
  "lead generation videos",
  "social media content planner",
];

const KINDS: [RegExp, string][] = [
  [/planner|planer|planering|planificador|planificateur/i, "planner"],
  [/checklist|check-?liste|lista/i, "checklist"],
  [/workbook|cuaderno|cahier|arbeitsbuch/i, "workbook"],
  [/template|plantilla|modèle|vorlage|mall/i, "templates"],
  [/tracker|suivi|seguimiento/i, "tracker"],
  [/budget|presupuesto/i, "budgeting"],
  [/calendar|calendrier|kalender|calendario/i, "calendar"],
  [/colou?ring|colorear|coloriage|ausmal|تلوين/i, "coloringpages"],
  [/maze|laberinto|labyrinth/i, "mazes"],
  [/activity|actividades|activités|aktivit|أنشطة/i, "activitybook"],
];

const STOP = new Set(["with", "your", "from", "that", "this", "first", "days", "para", "pour", "avec", "ohne", "eine", "einem", "your", "home", "kit"]);

/** Hashtag-style tags for a product, without the #. Lower-case, no spaces, at most eight. */
export function productTags(p: { title: string; audience: string; format: string }): string[] {
  const text = `${p.title} ${p.format}`;
  const base = isKidsProduct(p) ? ["kidsactivities", "printables"] : ["printables", "digitalproducts"];
  const kinds = KINDS.filter(([re]) => re.test(text)).map(([, tag]) => tag);
  const words = (p.title.toLowerCase().match(/[\p{L}]{4,}/gu) ?? []).filter((w) => !STOP.has(w)).slice(0, 3);
  return [...new Set([...base, ...kinds, ...words, "pdfdownload"])].slice(0, 8);
}

type JsonLd = Record<string, unknown>;

export function productJsonLd(p: { title: string; promise: string; audience: string; format: string; priceCents: number; language: string }, url: string, brand: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.promise,
    category: "Digital download",
    brand: { "@type": "Brand", name: brand },
    audience: { "@type": "Audience", audienceType: p.audience },
    inLanguage: p.language,
    keywords: productTags(p).join(", "),
    url,
    offers: { "@type": "Offer", price: (p.priceCents / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url },
  };
}

export function siteJsonLd(url: string): JsonLd[] {
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: "Kitforge", url, description: "AI studio that researches, writes and promotes printable digital products." },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Kitforge",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url,
      description: "Generate printable digital products, kids' activity books and short lead videos in eleven languages, then promote them daily.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ];
}

/** Serialises structured data for a script tag; "<" is escaped so content can never close the tag. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
