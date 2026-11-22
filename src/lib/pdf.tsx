import path from "node:path";
import type { ComponentProps } from "react";
import { Document, Ellipse, Font, Line, Page, Polygon, Polyline, Svg, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { drawingKind, makeDrawing, type Shape } from "./drawings";
import { isRtl, labelsFor, type Labels } from "./languages";
import type { Block, ProductOutline, ProductSection } from "./types";

export type PdfProduct = {
  title: string;
  promise: string;
  audience: string;
  pageSize: string;
  accent: string;
  outline: ProductOutline | null;
  sections: ProductSection[];
  brand: string;
  /** Language id; fixed labels are printed in it. English when missing. */
  language?: string;
};

const INK = "#1b1a17";
const MUTED = "#6b675f";
const RULE = "#d9d4c8";
const PAPER = "#fbf9f4";

const LTR = StyleSheet.create({
  bold: { fontFamily: "Helvetica-Bold" },
  brandLine: { fontSize: 9, color: MUTED, letterSpacing: 1.4, textTransform: "uppercase" },
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 56, fontFamily: "Helvetica", fontSize: 10.5, color: INK, lineHeight: 1.5 },
  cover: { padding: 0, fontFamily: "Helvetica", color: INK, backgroundColor: PAPER },
  coverBand: { height: "46%", padding: 56, justifyContent: "flex-end" },
  coverBody: { padding: 56, flexGrow: 1, justifyContent: "space-between" },
  coverTitle: { fontFamily: "Times-Bold", fontSize: 40, lineHeight: 1.1, color: "#ffffff" },
  coverSub: { fontSize: 15, lineHeight: 1.4, color: INK, maxWidth: 380 },
  eyebrow: { fontSize: 8.5, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED, marginBottom: 8 },
  h1: { fontFamily: "Times-Bold", fontSize: 26, lineHeight: 1.15, marginBottom: 8 },
  h2: { fontFamily: "Times-Bold", fontSize: 20, lineHeight: 1.2, marginBottom: 6 },
  goal: { fontSize: 11, color: MUTED, marginBottom: 12 },
  p: { marginBottom: 10 },
  blockTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 6 },
  block: { marginBottom: 11 },
  row: { flexDirection: "row", marginBottom: 5 },
  num: { width: 20, fontFamily: "Helvetica-Bold" },
  box: { width: 10, height: 10, borderWidth: 1, borderColor: INK, borderRadius: 2, marginRight: 9, marginTop: 2 },
  flex: { flex: 1 },
  callout: { borderLeftWidth: 3, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: PAPER, marginBottom: 10 },
  calloutLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 },
  template: { borderWidth: 1, borderColor: RULE, borderRadius: 4, padding: 12, fontFamily: "Courier", fontSize: 9.5, lineHeight: 1.45, marginBottom: 14 },
  line: { borderBottomWidth: 1, borderBottomColor: RULE, height: 17, marginBottom: 3 },
  footer: { position: "absolute", bottom: 28, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED },
  tocRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: RULE },
  tocSub: { fontSize: 9.5, color: MUTED, paddingVertical: 3, paddingLeft: 14 },
  divider: { flexGrow: 1, justifyContent: "center" },
  bigNum: { fontFamily: "Times-Bold", fontSize: 72, lineHeight: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  cell: { width: "14.28%", height: 44, borderWidth: 0.75, borderColor: RULE, padding: 4, fontSize: 8, color: MUTED },
});

// Right-to-left languages (Arabic): the same styles mirrored, set in an Arabic
// font with Helvetica behind it for digits and Latin words. The font is IBM
// Plex Sans Arabic: fonts that build dotted letters from separate glyphs (Noto
// Sans Arabic does) lose the first letter of each line in this PDF library.
const ARABIC = ["Plex Arabic", "Helvetica"];
const ARABIC_BOLD = ["Plex Arabic", "Helvetica-Bold"];
type Style = Record<string, unknown>;
function mirror(style: Style): Style {
  const o: Style = { ...style };
  if (typeof o.fontFamily === "string") {
    const bold = /Bold/.test(o.fontFamily);
    if (bold) o.fontWeight = 700;
    o.fontFamily = bold ? ARABIC_BOLD : ARABIC;
  }
  if (o.flexDirection === "row") o.flexDirection = "row-reverse";
  for (const [a, b] of [["marginLeft", "marginRight"], ["paddingLeft", "paddingRight"], ["borderLeftWidth", "borderRightWidth"]]) {
    const left = o[a];
    const right = o[b];
    delete o[a];
    delete o[b];
    if (right !== undefined) o[a] = right;
    if (left !== undefined) o[b] = left;
  }
  // Spaced-out or upper-cased letters break Arabic's joined script.
  delete o.letterSpacing;
  delete o.textTransform;
  return o;
}
const RTL = Object.fromEntries(Object.entries(LTR).map(([k, v]) => [k, mirror(v as Style)])) as unknown as typeof LTR;
Object.assign(RTL.page, { textAlign: "right" });
Object.assign(RTL.cover, { textAlign: "right" });

let arabicReady = false;
function ensureArabic() {
  if (arabicReady) return;
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules/@fontsource/ibm-plex-sans-arabic/files");
  Font.register({
    family: "Plex Arabic",
    fonts: [
      { src: path.join(dir, "ibm-plex-sans-arabic-arabic-400-normal.woff"), fontWeight: 400 },
      { src: path.join(dir, "ibm-plex-sans-arabic-arabic-700-normal.woff"), fontWeight: 700 },
    ],
  });
  arabicReady = true;
}

// Text direction is not inherited by the PDF library, so in a right-to-left
// document every text element is this variant, which sets it.
function TextRtl({ style, ...rest }: ComponentProps<typeof Text>) {
  const list = Array.isArray(style) ? style : style ? [style] : [];
  return <Text {...rest} style={[{ direction: "rtl" }, ...list] as never} />;
}

const FILL = { none: "none", white: "#ffffff", shade: "#e3dfd5", ink: INK } as const;

function ShapeView({ sh }: { sh: Shape }) {
  if (sh.t === "line") return <Line x1={sh.a[0]} y1={sh.a[1]} x2={sh.b[0]} y2={sh.b[1]} stroke={INK} strokeWidth={sh.thin ? 0.6 : 1.6} strokeDasharray={sh.dash ? "6 4" : undefined} />;
  if (sh.t === "ellipse") return <Ellipse cx={sh.c[0]} cy={sh.c[1]} rx={sh.rx} ry={sh.ry} stroke={INK} strokeWidth={1.6} fill={FILL[sh.fill ?? "white"]} />;
  if (sh.t === "text")
    return (
      <Text x={sh.at[0]} y={sh.at[1]} style={{ fontSize: sh.size, fontFamily: "Helvetica-Bold" }} fill={INK}>
        {sh.s}
      </Text>
    );
  const points = sh.pts.map((p) => p.join(",")).join(" ");
  const common = { points, stroke: INK, strokeWidth: 1.6, strokeDasharray: sh.dash ? "6 4" : undefined, fill: FILL[sh.fill ?? "white"] };
  return sh.open ? <Polyline {...common} /> : <Polygon {...common} />;
}

function DrawingView({ b, L, rtl }: { b: Block; L: Labels; rtl: boolean }) {
  const s = rtl ? RTL : LTR;
  const T = rtl ? TextRtl : Text;
  const d = makeDrawing(drawingKind(b.text), b.title);
  const size = d.family === "net" ? 440 : 370;
  return (
    <View style={s.block} wrap={false}>
      {b.title ? <T style={s.blockTitle}>{b.title}</T> : null}
      <T style={{ fontSize: 9.5, color: MUTED, marginBottom: 8 }}>{L[d.family]}</T>
      <View style={{ alignItems: "center" }}>
        <Svg viewBox={`0 0 ${d.w} ${d.h}`} width={size} height={size}>
          {d.shapes.map((sh, i) => (
            <ShapeView key={i} sh={sh} />
          ))}
        </Svg>
      </View>
    </View>
  );
}

function BlockView({ b, accent, L, rtl }: { b: Block; accent: string; L: Labels; rtl: boolean }) {
  const s = rtl ? RTL : LTR;
  const T = rtl ? TextRtl : Text;
  switch (b.type) {
    case "drawing":
      return <DrawingView b={b} L={L} rtl={rtl} />;
    case "steps":
      return (
        <View style={s.block}>
          {b.title ? <T style={s.blockTitle}>{b.title}</T> : null}
          {b.items.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <T style={[s.num, { color: accent }]}>{rtl ? `${i + 1}` : `${i + 1}.`}</T>
              <T style={s.flex}>{it}</T>
            </View>
          ))}
        </View>
      );
    case "checklist":
      return (
        <View style={s.block}>
          {b.title ? <T style={s.blockTitle}>{b.title}</T> : null}
          {b.items.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={s.box} />
              <T style={s.flex}>{it}</T>
            </View>
          ))}
        </View>
      );
    case "fill":
      return (
        <View style={s.block}>
          {b.title ? <T style={s.blockTitle}>{b.title}</T> : null}
          {b.items.map((it, i) => (
            <View key={i} wrap={false} style={{ marginBottom: 3 }}>
              <T>{it}</T>
              <View style={s.line} />
            </View>
          ))}
        </View>
      );
    case "template":
      return (
        <View wrap={false}>
          {b.title ? <T style={s.blockTitle}>{b.title}</T> : null}
          <T style={s.template}>{b.text}</T>
        </View>
      );
    case "tip":
    case "stuck":
      return (
        <View style={[s.callout, { [rtl ? "borderRightColor" : "borderLeftColor"]: b.type === "tip" ? accent : INK }]} wrap={false}>
          <T style={[s.calloutLabel, { color: b.type === "tip" ? accent : INK }]}>{b.type === "tip" ? L.tip : L.stuck}</T>
          <T>{b.text}</T>
        </View>
      );
    default:
      return <T style={s.p}>{b.text}</T>;
  }
}

function Footer({ title, rtl }: { title: string; rtl: boolean }) {
  const s = rtl ? RTL : LTR;
  const T = rtl ? TextRtl : Text;
  return (
    <View style={s.footer} fixed>
      <T>{title}</T>
      <T render={({ pageNumber }) => `${pageNumber}`} />
    </View>
  );
}

function Extra({ name, accent, L, rtl }: { name: string; accent: string; L: Labels; rtl: boolean }) {
  const s = rtl ? RTL : LTR;
  const T = rtl ? TextRtl : Text;
  const lower = name.toLowerCase();
  const isTracker = /track|calendar|log|habit|progress/.test(lower);
  return (
    <>
      <T style={[s.eyebrow, { color: accent }]}>{L.extras}</T>
      <T style={s.h1}>{name}</T>
      {isTracker ? (
        <View style={s.grid}>
          {Array.from({ length: 28 }, (_, i) => (
            <T key={i} style={s.cell}>
              {L.day} {i + 1}
            </T>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          {Array.from({ length: 16 }, (_, i) => (
            <View key={i} style={[s.row, { marginBottom: 12 }]}>
              <View style={s.box} />
              <View style={[s.line, s.flex]} />
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function ProductDocument({ p }: { p: PdfProduct }) {
  const size = p.pageSize === "A4" ? "A4" : "LETTER";
  const accent = /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : "#1f6f5c";
  const o = p.outline;
  const L = labelsFor(p.language ?? "en");
  const rtl = isRtl(p.language ?? "en");
  if (rtl) ensureArabic();
  const s = rtl ? RTL : LTR;
  const T = rtl ? TextRtl : Text;
  return (
    <Document title={p.title} author={p.brand} subject={p.promise}>
      <Page size={size} style={s.cover}>
        <View style={[s.coverBand, { backgroundColor: accent }]}>
          <T style={s.coverTitle}>{p.title}</T>
        </View>
        <View style={s.coverBody}>
          <T style={s.coverSub}>{o?.subtitle || p.promise}</T>
          <View>
            <T style={s.brandLine}>{p.brand}</T>
            <T style={{ fontSize: 7.5, color: MUTED, marginTop: 6 }}>
              © {new Date().getFullYear()} {p.brand}. {L.rights}
            </T>
          </View>
        </View>
      </Page>

      {o ? (
        <Page size={size} style={s.page}>
          <T style={[s.eyebrow, { color: accent }]}>{L.welcome}</T>
          <T style={s.h1}>{L.startHere}</T>
          {o.welcome.split(/\n+/).map((para, i) => (
            <T key={i} style={s.p}>
              {para}
            </T>
          ))}
          <T style={[s.blockTitle, { marginTop: 10 }]}>{L.howToUse}</T>
          {o.howToUse.map((it, i) => (
            <View key={i} style={s.row}>
              <T style={[s.num, { color: accent }]}>{rtl ? `${i + 1}` : `${i + 1}.`}</T>
              <T style={s.flex}>{it}</T>
            </View>
          ))}
          <Footer title={p.title} rtl={rtl} />
        </Page>
      ) : null}

      <Page size={size} style={s.page}>
        <T style={[s.eyebrow, { color: accent }]}>{L.contents}</T>
        <T style={s.h1}>{L.inside}</T>
        {p.sections.filter(Boolean).map((sec, i) => (
          <View key={i} wrap={false}>
            <View style={s.tocRow}>
              <T style={s.bold}>
                {i + 1}. {sec.title}
              </T>
            </View>
            {sec.pages.map((pg, j) => (
              <T key={j} style={s.tocSub}>
                {pg.heading}
              </T>
            ))}
          </View>
        ))}
        {o?.extras.length ? (
          <View wrap={false}>
            <View style={s.tocRow}>
              <T style={s.bold}>{L.extras}</T>
            </View>
            {o.extras.map((e, i) => (
              <T key={i} style={s.tocSub}>
                {e}
              </T>
            ))}
          </View>
        ) : null}
        <Footer title={p.title} rtl={rtl} />
      </Page>

      {/* One PDF page per product page: a single long flowing section overflows the renderer. */}
      {p.sections.filter(Boolean).flatMap((sec, i) => [
        <Page key={`s${i}`} size={size} style={s.page}>
          <View style={s.divider}>
            <T style={[s.bigNum, { color: accent }]}>{String(i + 1).padStart(2, "0")}</T>
            <T style={[s.h1, { marginTop: 12 }]}>{sec.title}</T>
            <T style={{ color: MUTED, fontSize: 12, maxWidth: 360 }}>{sec.summary}</T>
          </View>
          <Footer title={p.title} rtl={rtl} />
        </Page>,
        ...sec.pages.map((pg, j) => (
          <Page key={`s${i}p${j}`} size={size} style={s.page}>
            <T style={[s.eyebrow, { color: accent }]}>
              {sec.title} · {j + 1} {L.of} {sec.pages.length}
            </T>
            <T style={s.h2}>{pg.heading}</T>
            {pg.goal ? (
              <T style={s.goal}>
                {L.goal}: {pg.goal}
              </T>
            ) : null}
            {pg.blocks.map((b, k) => (
              <BlockView key={k} b={b} accent={accent} L={L} rtl={rtl} />
            ))}
            <Footer title={p.title} rtl={rtl} />
          </Page>
        )),
      ])}

      {(o?.extras ?? []).map((e, i) => (
        <Page key={`e${i}`} size={size} style={s.page}>
          <Extra name={e} accent={accent} L={L} rtl={rtl} />
          <Footer title={p.title} rtl={rtl} />
        </Page>
      ))}
    </Document>
  );
}

export function renderProductPdf(p: PdfProduct): Promise<Buffer> {
  return renderToBuffer(<ProductDocument p={p} />);
}
