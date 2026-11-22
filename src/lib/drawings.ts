// Built-in printable activities for children's products: mazes, dot-to-dots,
// fold-and-glue 3D paper models, "draw it in 3D" lessons and colouring pages
// made from 3D blocks. Every drawing is plain geometry, so it prints sharp at
// any size, needs no image service and is ours to sell. The same data is drawn
// by the PDF (src/lib/pdf.tsx) and by the on-screen preview.

export type Pt = [number, number];
export type Shape =
  | { t: "line"; a: Pt; b: Pt; dash?: boolean; thin?: boolean }
  | { t: "poly"; pts: Pt[]; open?: boolean; dash?: boolean; fill?: "none" | "white" | "shade" | "ink" }
  | { t: "ellipse"; c: Pt; rx: number; ry: number; fill?: "none" | "white" | "shade" | "ink" }
  | { t: "text"; at: Pt; s: string; size: number };

export const DRAWING_KINDS = [
  "maze",
  "dots-star",
  "dots-rocket",
  "dots-fish",
  "net-cube",
  "net-pyramid",
  "net-house",
  "draw-cube",
  "draw-cylinder",
  "draw-pyramid",
  "color-robot",
  "color-rocket",
  "color-castle",
] as const;
export type DrawingKind = (typeof DRAWING_KINDS)[number];
/** Which instruction line (see languages.ts) goes under a drawing. */
export type DrawingFamily = "maze" | "dots" | "net" | "draw" | "color";
export type Drawing = { kind: DrawingKind; family: DrawingFamily; w: number; h: number; shapes: Shape[] };

export const familyOf = (kind: DrawingKind): DrawingFamily => (kind === "maze" ? "maze" : (kind.split("-")[0] as DrawingFamily));

/** Maps whatever a model wrote ("a maze", "paper dice", "3d cube") onto a drawing we have. */
export function drawingKind(text: string, fallbackIndex = 0): DrawingKind {
  const t = text.trim().toLowerCase();
  const exact = DRAWING_KINDS.find((k) => k === t);
  if (exact) return exact;
  const has = (re: RegExp) => re.test(t);
  if (has(/maze|labyrint/)) return "maze";
  if (has(/dot/)) return has(/rocket/) ? "dots-rocket" : has(/fish/) ? "dots-fish" : "dots-star";
  if (has(/net|fold|paper|craft|cut|glue|dice|model/)) return has(/house|home/) ? "net-house" : has(/pyramid/) ? "net-pyramid" : "net-cube";
  if (has(/colou?r|paint/)) return has(/rocket|space/) ? "color-rocket" : has(/castle|tower/) ? "color-castle" : "color-robot";
  if (has(/cylinder|can\b|tube/)) return "draw-cylinder";
  if (has(/pyramid/)) return "draw-pyramid";
  if (has(/cube|box|3d|draw/)) return "draw-cube";
  if (has(/robot/)) return "color-robot";
  if (has(/rocket|space/)) return "color-rocket";
  if (has(/castle/)) return "color-castle";
  return DRAWING_KINDS[Math.abs(fallbackIndex) % DRAWING_KINDS.length];
}

/* ───────── helpers ───────── */

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const line = (a: Pt, b: Pt, dash = false): Shape => ({ t: "line", a, b, dash });
const poly = (pts: Pt[], fill: "none" | "white" | "shade" | "ink" = "white"): Shape => ({ t: "poly", pts, fill });
const dot = (c: Pt, r = 3): Shape => ({ t: "ellipse", c, rx: r, ry: r, fill: "ink" });
const circle = (c: Pt, r: number, fill: "none" | "white" | "shade" | "ink" = "white"): Shape => ({ t: "ellipse", c, rx: r, ry: r, fill });
const rect = (x: number, y: number, w: number, h: number, fill: "none" | "white" | "shade" = "white"): Shape =>
  poly(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    fill,
  );

function star(c: Pt, outer: number, inner = outer * 0.45): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (-90 + i * 36) * (Math.PI / 180);
    const r = i % 2 ? inner : outer;
    return [Math.round(c[0] + r * Math.cos(a)), Math.round(c[1] + r * Math.sin(a))] as Pt;
  });
}

/** A block drawn in 3D: front face, top and right side. (x, y) is the front's top-left corner. */
function box(x: number, y: number, w: number, h: number, d: number, shadeSide = false): Shape[] {
  return [
    poly(
      [
        [x, y],
        [x + d, y - d],
        [x + w + d, y - d],
        [x + w, y],
      ],
      "white",
    ),
    poly(
      [
        [x + w, y],
        [x + w + d, y - d],
        [x + w + d, y + h - d],
        [x + w, y + h],
      ],
      shadeSide ? "shade" : "white",
    ),
    rect(x, y, w, h),
  ];
}

/** A glue tab on the edge a→b. `side` picks which side of the edge it sticks out on. */
function tab(a: Pt, b: Pt, side: 1 | -1): Shape {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * side * 13;
  const ny = ux * side * 13;
  const inset = Math.min(12, len / 4);
  return {
    t: "poly",
    open: true,
    fill: "none",
    pts: [a, [a[0] + ux * inset + nx, a[1] + uy * inset + ny], [b[0] - ux * inset + nx, b[1] - uy * inset + ny], b],
  };
}

/* ───────── the drawings ───────── */

function maze(seed: string): Shape[] {
  const N = 11;
  const S = 32;
  const O = 24;
  const rand = rng(seed);
  // right[y][x]: wall on the right of the cell; down[y][x]: wall under it.
  const right = Array.from({ length: N }, () => Array<boolean>(N).fill(true));
  const down = Array.from({ length: N }, () => Array<boolean>(N).fill(true));
  const seen = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
  const stack: Pt[] = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = (
      [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as Pt[]
    ).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen[b][a]);
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [nx, ny] = next[Math.floor(rand() * next.length)];
    if (nx > x) right[y][x] = false;
    else if (nx < x) right[y][nx] = false;
    else if (ny > y) down[y][x] = false;
    else down[ny][x] = false;
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }
  const out: Shape[] = [rect(O, O, N * S, N * S, "none")];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (x < N - 1 && right[y][x]) out.push(line([O + (x + 1) * S, O + y * S], [O + (x + 1) * S, O + (y + 1) * S]));
      if (y < N - 1 && down[y][x]) out.push(line([O + x * S, O + (y + 1) * S], [O + (x + 1) * S, O + (y + 1) * S]));
    }
  out.push(dot([O + S / 2, O + S / 2], 6));
  out.push(poly(star([O + (N - 0.5) * S, O + (N - 0.5) * S], 11), "shade"));
  return out;
}

const OUTLINES: Record<"star" | "rocket" | "fish", Pt[]> = {
  star: star([200, 212], 165, 72),
  rocket: [
    [200, 30],
    [240, 82],
    [256, 150],
    [256, 250],
    [304, 300],
    [304, 356],
    [246, 322],
    [236, 366],
    [164, 366],
    [154, 322],
    [96, 356],
    [96, 300],
    [144, 250],
    [144, 150],
    [160, 82],
  ],
  fish: [
    [50, 200],
    [96, 150],
    [160, 118],
    [232, 122],
    [292, 166],
    [352, 112],
    [338, 200],
    [352, 288],
    [292, 234],
    [232, 278],
    [160, 282],
    [96, 250],
  ],
};

function dots(which: "star" | "rocket" | "fish"): Shape[] {
  const pts = OUTLINES[which];
  const cx = pts.reduce((n, p) => n + p[0], 0) / pts.length;
  const cy = pts.reduce((n, p) => n + p[1], 0) / pts.length;
  const out: Shape[] = [];
  pts.forEach((p, i) => {
    const d = Math.hypot(p[0] - cx, p[1] - cy) || 1;
    out.push(dot(p));
    out.push({ t: "text", at: [p[0] + ((p[0] - cx) / d) * 15 - 5, p[1] + ((p[1] - cy) / d) * 15 + 4], s: String(i + 1), size: 11 });
  });
  if (which === "fish") out.push(circle([122, 186], 7, "none"));
  if (which === "rocket") out.push(circle([200, 170], 22, "none"));
  return out;
}

function netCube(): Shape[] {
  const s = 80;
  // Column of four squares (A top, B, C, D) with arms L and R on B.
  const A: Pt = [160, 30];
  const B: Pt = [160, 110];
  const C: Pt = [160, 190];
  const D: Pt = [160, 270];
  const L: Pt = [80, 110];
  const R: Pt = [240, 110];
  const out: Shape[] = [];
  const sq = ([x, y]: Pt) => rect(x, y, s, s);
  [A, B, C, D, L, R].forEach((p) => out.push(sq(p)));
  // Folds between joined faces.
  out.push(line([160, 110], [240, 110], true), line([160, 190], [240, 190], true), line([160, 270], [240, 270], true));
  out.push(line([160, 110], [160, 190], true), line([240, 110], [240, 190], true));
  // Tabs.
  out.push(tab([160, 30], [160, 110], 1), tab([240, 30], [240, 110], -1));
  out.push(tab([160, 190], [160, 270], 1), tab([240, 190], [240, 270], -1));
  out.push(tab([160, 270], [160, 350], 1), tab([240, 270], [240, 350], -1), tab([160, 350], [240, 350], 1));
  // Dice pips: opposite faces add up to seven.
  const pips: Record<number, Pt[]> = {
    1: [[40, 40]],
    2: [
      [22, 22],
      [58, 58],
    ],
    3: [
      [22, 22],
      [40, 40],
      [58, 58],
    ],
    4: [
      [22, 22],
      [58, 22],
      [22, 58],
      [58, 58],
    ],
    5: [
      [22, 22],
      [58, 22],
      [40, 40],
      [22, 58],
      [58, 58],
    ],
    6: [
      [22, 20],
      [58, 20],
      [22, 40],
      [58, 40],
      [22, 60],
      [58, 60],
    ],
  };
  const faces: [Pt, number][] = [
    [A, 1],
    [B, 2],
    [C, 6],
    [D, 5],
    [L, 3],
    [R, 4],
  ];
  for (const [[x, y], n] of faces) for (const [px, py] of pips[n]) out.push(circle([x + px, y + py], 6, "none"));
  return out;
}

function netPyramid(): Shape[] {
  const a: Pt = [140, 140];
  const b: Pt = [260, 140];
  const c: Pt = [260, 260];
  const d: Pt = [140, 260];
  const top: Pt = [200, 28];
  const right: Pt = [372, 200];
  const bottom: Pt = [200, 372];
  const left: Pt = [28, 200];
  return [
    poly([a, top, b], "white"),
    poly([b, right, c], "white"),
    poly([c, bottom, d], "white"),
    poly([d, left, a], "white"),
    { t: "poly", pts: [a, b, c, d], dash: true, fill: "white" },
    tab(top, b, -1),
    tab(right, c, -1),
    tab(bottom, d, -1),
    tab(left, a, -1),
  ];
}

function netHouse(): Shape[] {
  const y = 170;
  const h = 90;
  const w = 80;
  const x0 = 40;
  const out: Shape[] = [];
  // Four walls in a strip: front, side, back, side.
  for (let i = 0; i < 4; i++) out.push(rect(x0 + i * w, y, w, h));
  for (let i = 1; i < 4; i++) out.push(line([x0 + i * w, y], [x0 + i * w, y + h], true));
  out.push(tab([x0 + 4 * w, y], [x0 + 4 * w, y + h], -1));
  // Gables on the front and back walls.
  for (const i of [0, 2]) {
    const l: Pt = [x0 + i * w, y];
    const r: Pt = [x0 + (i + 1) * w, y];
    const peak: Pt = [x0 + i * w + w / 2, y - 50];
    out.push(poly([l, peak, r], "white"), line(l, r, true), tab(l, peak, 1), tab(peak, r, 1));
  }
  // Roof halves on the side walls; each is as long as the gable's slope.
  const slope = Math.round(Math.hypot(w / 2, 50));
  for (const i of [1, 3]) {
    out.push(rect(x0 + i * w, y - slope, w, slope), line([x0 + i * w, y], [x0 + (i + 1) * w, y], true));
    for (let k = 1; k < 4; k++) out.push({ t: "line", a: [x0 + i * w, y - (slope * k) / 4], b: [x0 + (i + 1) * w, y - (slope * k) / 4], thin: true });
  }
  // Floor under the front wall.
  out.push(rect(x0, y + h, w, w), line([x0, y + h], [x0 + w, y + h], true));
  out.push(tab([x0, y + h], [x0, y + h + w], 1), tab([x0 + w, y + h], [x0 + w, y + h + w], -1), tab([x0, y + h + w], [x0 + w, y + h + w], 1));
  // Door and windows.
  out.push(rect(x0 + 28, y + 40, 24, 50, "none"), circle([x0 + 46, y + 66], 2, "ink"));
  for (const i of [1, 2, 3]) {
    out.push(rect(x0 + i * w + 24, y + 26, 32, 32, "none"));
    out.push(line([x0 + i * w + 40, y + 26], [x0 + i * w + 40, y + 58]), line([x0 + i * w + 24, y + 42], [x0 + i * w + 56, y + 42]));
  }
  return out;
}

function draw3d(which: "cube" | "cylinder" | "pyramid"): Shape[] {
  const out: Shape[] = [];
  const panel = (i: number): Pt => [28 + i * 124, 30];
  for (let i = 0; i < 3; i++) {
    const [x, y] = panel(i);
    out.push({ t: "text", at: [x, y + 4], s: String(i + 1), size: 16 });
    const ox = x + 26;
    const oy = y + 44;
    if (which === "cube") {
      if (i === 0) out.push(rect(ox, oy, 56, 56, "none"));
      if (i === 1) out.push(rect(ox, oy, 56, 56, "none"), { t: "poly", pts: [[ox, oy], [ox + 22, oy - 22], [ox + 78, oy - 22], [ox + 78, oy + 34], [ox + 56, oy + 56]], open: true, dash: true, fill: "none" }, line([ox + 56, oy], [ox + 78, oy - 22], true));
      if (i === 2) out.push(...box(ox, oy, 56, 56, 22, true));
    } else if (which === "cylinder") {
      const cx = ox + 34;
      if (i >= 2) out.push({ t: "ellipse", c: [cx, oy + 62], rx: 34, ry: 12, fill: "shade" }, rect(cx - 34, oy, 68, 62, "shade"));
      if (i === 1) out.push(line([cx - 34, oy], [cx - 34, oy + 62]), line([cx + 34, oy], [cx + 34, oy + 62]));
      if (i >= 2) out.push(line([cx - 34, oy], [cx - 34, oy + 62]), line([cx + 34, oy], [cx + 34, oy + 62]));
      out.push({ t: "ellipse", c: [cx, oy], rx: 34, ry: 12, fill: "white" });
    } else {
      const base: Pt[] = [
        [ox, oy + 52],
        [ox + 44, oy + 66],
        [ox + 84, oy + 46],
      ];
      const apex: Pt = [ox + 40, oy - 16];
      if (i === 0) out.push({ t: "poly", pts: base, open: true, fill: "none" });
      if (i === 1) out.push({ t: "poly", pts: base, open: true, fill: "none" }, dot(apex, 3), line(base[1], apex, true));
      if (i === 2) out.push(poly([base[1], base[2], apex], "shade"), poly([base[0], base[1], apex], "white"));
    }
  }
  // Practice area: a slanted dot grid, the classic guide for drawing in 3D.
  for (let r = 0; r < 10; r++) for (let c = 0; c < 17; c++) out.push(dot([34 + c * 20 + (r % 2 ? 10 : 0), 168 + r * 22], 1.4));
  return out;
}

function colorRobot(): Shape[] {
  return [
    line([212, 62], [212, 34]),
    circle([212, 28], 8),
    ...box(150, 78, 100, 72, 24),
    circle([180, 108], 11),
    circle([220, 108], 11),
    circle([180, 108], 3, "ink"),
    circle([220, 108], 3, "ink"),
    rect(182, 130, 36, 8, "none"),
    ...box(86, 176, 34, 96, 12),
    ...box(280, 176, 34, 96, 12),
    ...box(130, 170, 140, 120, 30),
    rect(152, 190, 96, 46, "none"),
    circle([170, 213], 9),
    circle([200, 213], 9),
    circle([230, 213], 9),
    rect(152, 250, 96, 14, "none"),
    ...box(144, 306, 46, 62, 16),
    ...box(210, 306, 46, 62, 16),
  ];
}

function colorRocket(): Shape[] {
  return [
    poly(star([70, 70], 16), "white"),
    poly(star([330, 110], 12), "white"),
    poly(star([320, 300], 15), "white"),
    poly(star([66, 250], 11), "white"),
    circle([318, 46], 20),
    // fins
    poly(
      [
        [160, 230],
        [112, 300],
        [160, 290],
      ],
      "white",
    ),
    poly(
      [
        [266, 204],
        [306, 270],
        [266, 264],
      ],
      "white",
    ),
    // flames
    poly(
      [
        [172, 290],
        [186, 350],
        [200, 312],
        [214, 366],
        [228, 290],
      ],
      "white",
    ),
    ...box(160, 120, 80, 170, 26),
    // nose
    poly(
      [
        [240, 120],
        [266, 94],
        [212, 36],
      ],
      "white",
    ),
    poly(
      [
        [160, 120],
        [240, 120],
        [212, 36],
      ],
      "white",
    ),
    circle([200, 168], 20),
    circle([200, 168], 12, "none"),
    circle([200, 228], 13),
    rect(160, 262, 80, 12, "none"),
  ];
}

function colorCastle(): Shape[] {
  const out: Shape[] = [circle([330, 54], 24), poly([[20, 372], [380, 372]], "none")];
  const tower = (x: number, y: number, w: number, h: number) => {
    out.push(...box(x, y, w, h, 16));
    const n = 3;
    const cw = w / (n * 2 - 1);
    for (let i = 0; i < n; i++) out.push(...box(x + i * cw * 2, y - 14, cw, 14, 6));
  };
  const flag = (x: number, y: number) => {
    out.push(line([x, y], [x, y - 44]));
    out.push(poly([[x, y - 44], [x + 30, y - 34], [x, y - 24]], "white"));
  };
  flag(88, 120);
  flag(296, 120);
  flag(196, 86);
  // back tower, then the two front ones, then the wall with its gate.
  tower(156, 104, 80, 180);
  tower(52, 140, 72, 232);
  tower(260, 140, 72, 232);
  out.push(...box(124, 230, 136, 142, 16));
  for (let i = 0; i < 4; i++) out.push(...box(124 + i * 38, 216, 22, 14, 6));
  out.push({ t: "poly", pts: [[166, 372], [166, 312], [172, 294], [192, 284], [212, 294], [218, 312], [218, 372]], open: true, fill: "white" });
  out.push(line([192, 284], [192, 372]));
  for (const [x, y] of [[76, 190], [284, 190], [184, 150]] as Pt[]) out.push({ t: "poly", pts: [[x, y + 34], [x, y + 10], [x + 12, y], [x + 24, y + 10], [x + 24, y + 34]], fill: "white" });
  return out;
}

export function makeDrawing(kind: DrawingKind, seed = ""): Drawing {
  const family = familyOf(kind);
  const base = { kind, family, w: 400, h: 400 };
  switch (kind) {
    case "maze":
      return { ...base, shapes: maze(seed || "maze") };
    case "dots-star":
      return { ...base, shapes: dots("star") };
    case "dots-rocket":
      return { ...base, shapes: dots("rocket") };
    case "dots-fish":
      return { ...base, shapes: dots("fish") };
    case "net-cube":
      return { ...base, shapes: netCube() };
    case "net-pyramid":
      return { ...base, shapes: netPyramid() };
    case "net-house":
      return { ...base, shapes: netHouse() };
    case "draw-cube":
      return { ...base, shapes: draw3d("cube") };
    case "draw-cylinder":
      return { ...base, shapes: draw3d("cylinder") };
    case "draw-pyramid":
      return { ...base, shapes: draw3d("pyramid") };
    case "color-robot":
      return { ...base, shapes: colorRobot() };
    case "color-rocket":
      return { ...base, shapes: colorRocket() };
    case "color-castle":
      return { ...base, shapes: colorCastle() };
  }
}

/** True when a product is for children, in any of the supported languages. */
export function isKidsProduct(p: { title: string; audience: string; format: string }): boolean {
  const text = `${p.title} ${p.audience} ${p.format}`;
  // Arabic has no ASCII word boundaries, so it is matched on its own.
  if (/أطفال|الأطفال|للأطفال|طفل|تلوين/.test(text)) return true;
  return /\b(kids?|child(ren)?|toddlers?|preschool\w*|kindergar\w*|colou?ring|activity (book|pack|pages?)|ages? ?\d|niñ[oa]s?|enfants?|kinder|barn|børn|bambin[io]|crianças?|kinderen)\b/i.test(text);
}
