import { Document, Ellipse, Line, Page, Polygon, Polyline, Svg, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { drawingKind, makeDrawing, type Shape } from "./drawings";
import { labelsFor, type Labels } from "./languages";
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

const s = StyleSheet.create({
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

function DrawingView({ b, L }: { b: Block; L: Labels }) {
  const d = makeDrawing(drawingKind(b.text), b.title);
  const size = d.family === "net" ? 450 : 410;
  return (
    <View style={s.block} wrap={false}>
      {b.title ? <Text style={s.blockTitle}>{b.title}</Text> : null}
      <Text style={{ fontSize: 9.5, color: MUTED, marginBottom: 8 }}>{L[d.family]}</Text>
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

function BlockView({ b, accent, L }: { b: Block; accent: string; L: Labels }) {
  switch (b.type) {
    case "drawing":
      return <DrawingView b={b} L={L} />;
    case "steps":
      return (
        <View style={s.block}>
          {b.title ? <Text style={s.blockTitle}>{b.title}</Text> : null}
          {b.items.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={[s.num, { color: accent }]}>{i + 1}.</Text>
              <Text style={s.flex}>{it}</Text>
            </View>
          ))}
        </View>
      );
    case "checklist":
      return (
        <View style={s.block}>
          {b.title ? <Text style={s.blockTitle}>{b.title}</Text> : null}
          {b.items.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={s.box} />
              <Text style={s.flex}>{it}</Text>
            </View>
          ))}
        </View>
      );
    case "fill":
      return (
        <View style={s.block}>
          {b.title ? <Text style={s.blockTitle}>{b.title}</Text> : null}
          {b.items.map((it, i) => (
            <View key={i} wrap={false} style={{ marginBottom: 3 }}>
              <Text>{it}</Text>
              <View style={s.line} />
            </View>
          ))}
        </View>
      );
    case "template":
      return (
        <View wrap={false}>
          {b.title ? <Text style={s.blockTitle}>{b.title}</Text> : null}
          <Text style={s.template}>{b.text}</Text>
        </View>
      );
    case "tip":
    case "stuck":
      return (
        <View style={[s.callout, { borderLeftColor: b.type === "tip" ? accent : INK }]} wrap={false}>
          <Text style={[s.calloutLabel, { color: b.type === "tip" ? accent : INK }]}>{b.type === "tip" ? L.tip : L.stuck}</Text>
          <Text>{b.text}</Text>
        </View>
      );
    default:
      return <Text style={s.p}>{b.text}</Text>;
  }
}

function Footer({ title }: { title: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{title}</Text>
      <Text render={({ pageNumber }) => `${pageNumber}`} />
    </View>
  );
}

function Extra({ name, accent, L }: { name: string; accent: string; L: Labels }) {
  const lower = name.toLowerCase();
  const isTracker = /track|calendar|log|habit|progress/.test(lower);
  return (
    <>
      <Text style={[s.eyebrow, { color: accent }]}>{L.extras}</Text>
      <Text style={s.h1}>{name}</Text>
      {isTracker ? (
        <View style={s.grid}>
          {Array.from({ length: 28 }, (_, i) => (
            <Text key={i} style={s.cell}>
              {L.day} {i + 1}
            </Text>
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
  return (
    <Document title={p.title} author={p.brand} subject={p.promise}>
      <Page size={size} style={s.cover}>
        <View style={[s.coverBand, { backgroundColor: accent }]}>
          <Text style={s.coverTitle}>{p.title}</Text>
        </View>
        <View style={s.coverBody}>
          <Text style={s.coverSub}>{o?.subtitle || p.promise}</Text>
          <View>
            <Text style={{ fontSize: 9, color: MUTED, letterSpacing: 1.4, textTransform: "uppercase" }}>{p.brand}</Text>
            <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 6 }}>
              © {new Date().getFullYear()} {p.brand}. {L.rights}
            </Text>
          </View>
        </View>
      </Page>

      {o ? (
        <Page size={size} style={s.page}>
          <Text style={[s.eyebrow, { color: accent }]}>{L.welcome}</Text>
          <Text style={s.h1}>{L.startHere}</Text>
          {o.welcome.split(/\n+/).map((para, i) => (
            <Text key={i} style={s.p}>
              {para}
            </Text>
          ))}
          <Text style={[s.blockTitle, { marginTop: 10 }]}>{L.howToUse}</Text>
          {o.howToUse.map((it, i) => (
            <View key={i} style={s.row}>
              <Text style={[s.num, { color: accent }]}>{i + 1}.</Text>
              <Text style={s.flex}>{it}</Text>
            </View>
          ))}
          <Footer title={p.title} />
        </Page>
      ) : null}

      <Page size={size} style={s.page}>
        <Text style={[s.eyebrow, { color: accent }]}>{L.contents}</Text>
        <Text style={s.h1}>{L.inside}</Text>
        {p.sections.filter(Boolean).map((sec, i) => (
          <View key={i} wrap={false}>
            <View style={s.tocRow}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {i + 1}. {sec.title}
              </Text>
            </View>
            {sec.pages.map((pg, j) => (
              <Text key={j} style={s.tocSub}>
                {pg.heading}
              </Text>
            ))}
          </View>
        ))}
        {o?.extras.length ? (
          <View wrap={false}>
            <View style={s.tocRow}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{L.extras}</Text>
            </View>
            {o.extras.map((e, i) => (
              <Text key={i} style={s.tocSub}>
                {e}
              </Text>
            ))}
          </View>
        ) : null}
        <Footer title={p.title} />
      </Page>

      {p.sections.filter(Boolean).map((sec, i) => (
        <Page key={`s${i}`} size={size} style={s.page}>
          <View style={s.divider} break={false}>
            <Text style={[s.bigNum, { color: accent }]}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={[s.h1, { marginTop: 12 }]}>{sec.title}</Text>
            <Text style={{ color: MUTED, fontSize: 12, maxWidth: 360 }}>{sec.summary}</Text>
          </View>
          {sec.pages.map((pg, j) => (
            <View key={j} break>
              <Text style={[s.eyebrow, { color: accent }]}>
                {sec.title} · {j + 1} {L.of} {sec.pages.length}
              </Text>
              <Text style={s.h2}>{pg.heading}</Text>
              {pg.goal ? (
                <Text style={s.goal}>
                  {L.goal}: {pg.goal}
                </Text>
              ) : null}
              {pg.blocks.map((b, k) => (
                <BlockView key={k} b={b} accent={accent} L={L} />
              ))}
            </View>
          ))}
          <Footer title={p.title} />
        </Page>
      ))}

      {(o?.extras ?? []).map((e, i) => (
        <Page key={`e${i}`} size={size} style={s.page}>
          <Extra name={e} accent={accent} L={L} />
          <Footer title={p.title} />
        </Page>
      ))}
    </Document>
  );
}

export function renderProductPdf(p: PdfProduct): Promise<Buffer> {
  return renderToBuffer(<ProductDocument p={p} />);
}
