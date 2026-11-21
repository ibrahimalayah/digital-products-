import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
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
};

const INK = "#1b1a17";
const MUTED = "#6b675f";
const RULE = "#d9d4c8";
const PAPER = "#fbf9f4";

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56, fontFamily: "Helvetica", fontSize: 10.5, color: INK, lineHeight: 1.5 },
  cover: { padding: 0, fontFamily: "Helvetica", color: INK, backgroundColor: PAPER },
  coverBand: { height: "46%", padding: 56, justifyContent: "flex-end" },
  coverBody: { padding: 56, flexGrow: 1, justifyContent: "space-between" },
  coverTitle: { fontFamily: "Times-Bold", fontSize: 40, lineHeight: 1.1, color: "#ffffff" },
  coverSub: { fontSize: 15, lineHeight: 1.4, color: INK, maxWidth: 380 },
  eyebrow: { fontSize: 8.5, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED, marginBottom: 8 },
  h1: { fontFamily: "Times-Bold", fontSize: 26, lineHeight: 1.15, marginBottom: 8 },
  h2: { fontFamily: "Times-Bold", fontSize: 20, lineHeight: 1.2, marginBottom: 6 },
  goal: { fontSize: 11, color: MUTED, marginBottom: 16 },
  p: { marginBottom: 10 },
  blockTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 6 },
  block: { marginBottom: 14 },
  row: { flexDirection: "row", marginBottom: 5 },
  num: { width: 20, fontFamily: "Helvetica-Bold" },
  box: { width: 10, height: 10, borderWidth: 1, borderColor: INK, borderRadius: 2, marginRight: 9, marginTop: 2 },
  flex: { flex: 1 },
  callout: { borderLeftWidth: 3, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: PAPER, marginBottom: 14 },
  calloutLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 },
  template: { borderWidth: 1, borderColor: RULE, borderRadius: 4, padding: 12, fontFamily: "Courier", fontSize: 9.5, lineHeight: 1.45, marginBottom: 14 },
  line: { borderBottomWidth: 1, borderBottomColor: RULE, height: 20, marginBottom: 2 },
  footer: { position: "absolute", bottom: 28, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED },
  tocRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: RULE },
  tocSub: { fontSize: 9.5, color: MUTED, paddingVertical: 3, paddingLeft: 14 },
  divider: { flexGrow: 1, justifyContent: "center" },
  bigNum: { fontFamily: "Times-Bold", fontSize: 72, lineHeight: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  cell: { width: "14.28%", height: 44, borderWidth: 0.75, borderColor: RULE, padding: 4, fontSize: 8, color: MUTED },
});

function BlockView({ b, accent }: { b: Block; accent: string }) {
  switch (b.type) {
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
            <View key={i} wrap={false} style={{ marginBottom: 8 }}>
              <Text>{it}</Text>
              <View style={s.line} />
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
          <Text style={[s.calloutLabel, { color: b.type === "tip" ? accent : INK }]}>{b.type === "tip" ? "Pro tip" : "If you're stuck"}</Text>
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

function Extra({ name, accent }: { name: string; accent: string }) {
  const lower = name.toLowerCase();
  const isTracker = /track|calendar|log|habit|progress/.test(lower);
  return (
    <>
      <Text style={[s.eyebrow, { color: accent }]}>Extras</Text>
      <Text style={s.h1}>{name}</Text>
      {isTracker ? (
        <View style={s.grid}>
          {Array.from({ length: 28 }, (_, i) => (
            <Text key={i} style={s.cell}>
              Day {i + 1}
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
  return (
    <Document title={p.title} author={p.brand} subject={p.promise}>
      <Page size={size} style={s.cover}>
        <View style={[s.coverBand, { backgroundColor: accent }]}>
          <Text style={s.coverTitle}>{p.title}</Text>
        </View>
        <View style={s.coverBody}>
          <Text style={s.coverSub}>{o?.subtitle || p.promise}</Text>
          <Text style={{ fontSize: 9, color: MUTED, letterSpacing: 1.4, textTransform: "uppercase" }}>{p.brand}</Text>
        </View>
      </Page>

      {o ? (
        <Page size={size} style={s.page}>
          <Text style={[s.eyebrow, { color: accent }]}>Welcome</Text>
          <Text style={s.h1}>Start here</Text>
          {o.welcome.split(/\n+/).map((para, i) => (
            <Text key={i} style={s.p}>
              {para}
            </Text>
          ))}
          <Text style={[s.blockTitle, { marginTop: 10 }]}>How to use this</Text>
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
        <Text style={[s.eyebrow, { color: accent }]}>Contents</Text>
        <Text style={s.h1}>What&apos;s inside</Text>
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
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Extras</Text>
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
                {sec.title} · {j + 1} of {sec.pages.length}
              </Text>
              <Text style={s.h2}>{pg.heading}</Text>
              <Text style={s.goal}>Goal: {pg.goal}</Text>
              {pg.blocks.map((b, k) => (
                <BlockView key={k} b={b} accent={accent} />
              ))}
            </View>
          ))}
          <Footer title={p.title} />
        </Page>
      ))}

      {(o?.extras ?? []).map((e, i) => (
        <Page key={`e${i}`} size={size} style={s.page}>
          <Extra name={e} accent={accent} />
          <Footer title={p.title} />
        </Page>
      ))}
    </Document>
  );
}

export function renderProductPdf(p: PdfProduct): Promise<Buffer> {
  return renderToBuffer(<ProductDocument p={p} />);
}
