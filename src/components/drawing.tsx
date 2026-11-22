import { drawingKind, makeDrawing } from "@/lib/drawings";

const FILL = { none: "none", white: "#ffffff", shade: "#e3dfd5", ink: "#1b1a17" } as const;
const INK = "#1b1a17";

/** On-screen version of a printable drawing; the PDF draws the same shapes. */
export function Drawing({ kind, seed, className }: { kind: string; seed: string; className?: string }) {
  const d = makeDrawing(drawingKind(kind), seed);
  return (
    <svg viewBox={`0 0 ${d.w} ${d.h}`} className={className} role="img" aria-label={`Printable activity: ${d.kind.replace("-", " ")}`} style={{ background: "#fff" }}>
      {d.shapes.map((sh, i) => {
        if (sh.t === "line") return <line key={i} x1={sh.a[0]} y1={sh.a[1]} x2={sh.b[0]} y2={sh.b[1]} stroke={INK} strokeWidth={sh.thin ? 0.6 : 1.6} strokeDasharray={sh.dash ? "6 4" : undefined} />;
        if (sh.t === "ellipse") return <ellipse key={i} cx={sh.c[0]} cy={sh.c[1]} rx={sh.rx} ry={sh.ry} stroke={INK} strokeWidth={1.6} fill={FILL[sh.fill ?? "white"]} />;
        if (sh.t === "text")
          return (
            <text key={i} x={sh.at[0]} y={sh.at[1]} fontSize={sh.size} fontWeight={700} fill={INK}>
              {sh.s}
            </text>
          );
        const points = sh.pts.map((p) => p.join(",")).join(" ");
        const common = { points, stroke: INK, strokeWidth: 1.6, strokeDasharray: sh.dash ? "6 4" : undefined, fill: FILL[sh.fill ?? "white"] };
        return sh.open ? <polyline key={i} {...common} /> : <polygon key={i} {...common} />;
      })}
    </svg>
  );
}
