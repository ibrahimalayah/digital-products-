// Draws and records a short vertical video in the browser: a presenter photo or
// clip (or a product card), spoken lines, animated captions and a closing call
// to action. No server and no upload: the file is made on the owner's device.
import type { VideoScene } from "./types";
import type { Clip } from "./voice";

export const W = 720;
export const H = 1280;
export const FPS = 30;

export type Timeline = { starts: number[]; durs: number[]; total: number };

export type Frame = {
  scenes: VideoScene[];
  brand: string;
  productTitle: string;
  cta: string;
  link: string;
  accent: string;
  presenter: CanvasImageSource | null;
  presenterSize: { w: number; h: number } | null;
  aiVoice: boolean;
  fontSans: string;
  fontDisplay: string;
};

const wordsIn = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** Scene timing: as long as its spoken line, or a reading pace when there is no voice. */
export function timeline(scenes: VideoScene[], clips: (Clip | null)[]): Timeline {
  const durs = scenes.map((s, i) => {
    const c = clips[i];
    return c ? c.samples.length / c.rate + 0.4 : Math.max(2.2, wordsIn(s.narration).length / 2.6 + 0.6);
  });
  const starts: number[] = [];
  let t = 0;
  for (const d of durs) {
    starts.push(t);
    t += d;
  }
  return { starts, durs, total: t };
}

/** Lays the spoken lines onto one track. Returns null when there is no voice. */
export function mix(clips: (Clip | null)[], tl: Timeline): { samples: Float32Array; rate: number } | null {
  const first = clips.find(Boolean);
  if (!first) return null;
  const rate = first.rate;
  const out = new Float32Array(Math.ceil((tl.total + 0.3) * rate));
  clips.forEach((c, i) => {
    if (!c) return;
    const at = Math.floor((tl.starts[i] + 0.12) * rate);
    out.set(c.samples.subarray(0, Math.max(0, out.length - at)), at);
  });
  return { samples: out, rate };
}

/** Loudness per video frame, 0 to 1, used to make the picture react to the voice. */
export function envelope(samples: Float32Array, rate: number): Float32Array {
  const step = Math.floor(rate / FPS);
  const env = new Float32Array(Math.ceil(samples.length / step));
  let peak = 0.0001;
  for (let f = 0; f < env.length; f++) {
    let sum = 0;
    const end = Math.min(samples.length, (f + 1) * step);
    for (let i = f * step; i < end; i++) sum += samples[i] * samples[i];
    env[f] = Math.sqrt(sum / step);
    if (env[f] > peak) peak = env[f];
  }
  for (let f = 0; f < env.length; f++) env[f] = Math.min(1, env[f] / peak);
  return env;
}

export function sceneAt(tl: Timeline, t: number) {
  let i = 0;
  while (i < tl.starts.length - 1 && t >= tl.starts[i + 1]) i++;
  return i;
}

function wrap(ctx: CanvasRenderingContext2D, words: string[], max: number): string[][] {
  const lines: string[][] = [[]];
  for (const w of words) {
    const line = lines[lines.length - 1];
    if (line.length && ctx.measureText([...line, w].join(" ")).width > max) lines.push([w]);
    else line.push(w);
  }
  return lines;
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function drawFrame(ctx: CanvasRenderingContext2D, f: Frame, tl: Timeline, t: number, level: number) {
  const i = sceneAt(tl, t);
  const local = t - tl.starts[i];
  const last = i === f.scenes.length - 1;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // Background: the presenter, or a product card on the brand colour.
  ctx.fillStyle = "#14130f";
  ctx.fillRect(0, 0, W, H);
  if (f.presenter && f.presenterSize) {
    const zoom = 1.03 + 0.07 * (t / tl.total) + level * 0.012;
    const s = Math.max(W / f.presenterSize.w, H / f.presenterSize.h) * zoom;
    const dw = f.presenterSize.w * s;
    const dh = f.presenterSize.h * s;
    // Faces sit in the upper part of a portrait, so the crop favours the top.
    ctx.drawImage(f.presenter, (W - dw) / 2, (H - dh) * 0.3, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, f.accent);
    g.addColorStop(1, "#14130f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(W * 0.86, 210 + 14 * Math.sin(t * 0.8), 230, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Product card
    ctx.save();
    ctx.translate(W / 2, 400 + 8 * Math.sin(t * 1.1));
    ctx.rotate(-0.045);
    ctx.scale(1 + level * 0.01, 1 + level * 0.01);
    ctx.shadowColor = "rgba(0,0,0,.4)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    ctx.fillStyle = "#faf6ec";
    ctx.beginPath();
    ctx.roundRect(-200, -230, 400, 460, 18);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = f.accent;
    ctx.fillRect(-200, -230, 400, 14);
    ctx.fillStyle = "#6b665c";
    ctx.font = `600 20px ${f.fontSans}`;
    ctx.fillText("PRINTABLE PDF KIT", -164, -166);
    ctx.fillStyle = "#1b1a17";
    ctx.font = `400 48px ${f.fontDisplay}`;
    wrap(ctx, wordsIn(f.productTitle), 328)
      .slice(0, 5)
      .forEach((line, n) => ctx.fillText(line.join(" "), -164, -98 + n * 56));
    ctx.fillStyle = f.accent;
    ctx.font = `600 22px ${f.fontSans}`;
    ctx.fillText(f.brand, -164, 196);
    ctx.restore();
  }

  // Shade top and bottom so text stays readable on any picture.
  const top = ctx.createLinearGradient(0, 0, 0, 280);
  top.addColorStop(0, "rgba(0,0,0,.55)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 280);
  const bottom = ctx.createLinearGradient(0, H * 0.48, 0, H);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(0.55, "rgba(0,0,0,.72)");
  bottom.addColorStop(1, "rgba(0,0,0,.9)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H * 0.48, W, H * 0.52);

  // Story-style progress segments.
  const gap = 8;
  const segW = (W - 80 - gap * (f.scenes.length - 1)) / f.scenes.length;
  f.scenes.forEach((_, n) => {
    const x = 40 + n * (segW + gap);
    ctx.fillStyle = "rgba(255,255,255,.3)";
    ctx.beginPath();
    ctx.roundRect(x, 44, segW, 6, 3);
    ctx.fill();
    const fill = n < i ? 1 : n === i ? Math.min(1, local / tl.durs[i]) : 0;
    if (fill > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x, 44, segW * fill, 6, 3);
      ctx.fill();
    }
  });

  // Brand, with small bars that move with the voice.
  ctx.font = `600 26px ${f.fontSans}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(f.brand, 40, 108);
  const bx = 52 + ctx.measureText(f.brand).width;
  for (let b = 0; b < 4; b++) {
    const h = 6 + level * (10 + 8 * Math.abs(Math.sin(t * 9 + b * 1.7)));
    ctx.fillRect(bx + b * 8, 100 - h, 4, h);
  }

  // Caption: words light up as the line is spoken.
  const words = wordsIn(f.scenes[i].caption);
  ctx.font = `800 66px ${f.fontSans}`;
  const lines = wrap(ctx, words, W - 110);
  const lineH = 80;
  const blockBottom = last ? H - 420 : H - 300;
  const enter = ease(local / 0.28);
  const shown = Math.ceil(words.length * Math.min(1, (local + 0.05) / Math.max(0.6, tl.durs[i] * 0.45)));
  let n = 0;
  ctx.shadowColor = "rgba(0,0,0,.55)";
  ctx.shadowBlur = 14;
  lines.forEach((line, li) => {
    const y = blockBottom - (lines.length - 1 - li) * lineH + (1 - enter) * 26;
    const lineW = ctx.measureText(line.join(" ")).width;
    // Arabic and Hebrew read right to left, so their words are laid out from the right edge.
    const rtl = /[\u0590-\u08FF]/.test(line.join(""));
    let x = rtl ? (W + lineW) / 2 : (W - lineW) / 2;
    for (const w of line) {
      ctx.globalAlpha = enter * (n < shown ? 1 : 0.38);
      ctx.fillStyle = "#ffffff";
      if (rtl) x -= ctx.measureText(w).width;
      ctx.fillText(w, x, y);
      x += rtl ? -ctx.measureText(" ").width : ctx.measureText(w + " ").width;
      n++;
    }
  });
  ctx.globalAlpha = 1;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // Closing call to action.
  if (last) {
    const a = ease((local - 0.15) / 0.35);
    ctx.globalAlpha = a;
    const y = H - 330 + (1 - a) * 20;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(60, y, W - 120, 100, 50);
    ctx.fill();
    ctx.fillStyle = "#14130f";
    ctx.font = `700 38px ${f.fontSans}`;
    ctx.fillText(f.cta, (W - ctx.measureText(f.cta).width) / 2, y + 63);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.font = `500 26px ${f.fontSans}`;
    ctx.fillText(f.link, (W - ctx.measureText(f.link).width) / 2, y + 146);
    ctx.globalAlpha = 1;
  }

  if (f.aiVoice) {
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.font = `500 20px ${f.fontSans}`;
    ctx.fillText("AI voice", 40, H - 44);
  }
  ctx.restore();
}

function pickMime(): string {
  const options = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

/**
 * Plays the video on the canvas in real time, with sound. With `record` it also
 * captures picture and sound into a file and returns it.
 */
export async function play(
  canvas: HTMLCanvasElement,
  f: Frame,
  tl: Timeline,
  audio: { samples: Float32Array; rate: number } | null,
  opts: { record: boolean; onTime?: (fraction: number) => void; signal?: AbortSignal },
): Promise<{ blob: Blob; mime: string } | null> {
  const ctx = canvas.getContext("2d")!;
  const ac = new AudioContext();
  await ac.resume().catch(() => undefined);
  const dest = opts.record && audio ? ac.createMediaStreamDestination() : null;
  let src: AudioBufferSourceNode | null = null;
  let env: Float32Array | null = null;
  if (audio) {
    const buf = ac.createBuffer(1, audio.samples.length, audio.rate);
    buf.getChannelData(0).set(audio.samples);
    src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    if (dest) src.connect(dest);
    env = envelope(audio.samples, audio.rate);
  }

  let rec: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  const mime = opts.record ? pickMime() : "";
  if (opts.record) {
    const tracks = [...canvas.captureStream(FPS).getVideoTracks(), ...(dest ? dest.stream.getAudioTracks() : [])];
    rec = new MediaRecorder(new MediaStream(tracks), { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_500_000, audioBitsPerSecond: 128_000 });
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    drawFrame(ctx, f, tl, 0, 0);
    rec.start(200);
  }

  // The sound clock drives the picture so the two never drift apart.
  const useAudioClock = Boolean(src);
  const t0 = useAudioClock ? ac.currentTime + 0.1 : performance.now() / 1000;
  src?.start(t0);
  const now = () => (useAudioClock ? ac.currentTime : performance.now() / 1000) - t0;

  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = Math.max(0, now());
      if (opts.signal?.aborted || t >= tl.total) {
        drawFrame(ctx, f, tl, Math.max(0, tl.total - 0.02), 0);
        resolve();
        return;
      }
      drawFrame(ctx, f, tl, t, env ? env[Math.min(env.length - 1, Math.floor(t * FPS))] : 0);
      opts.onTime?.(t / tl.total);
      requestAnimationFrame(tick);
    };
    tick();
  });

  let out: { blob: Blob; mime: string } | null = null;
  if (rec) {
    await new Promise((r) => setTimeout(r, 250));
    await new Promise<void>((resolve) => {
      rec!.onstop = () => resolve();
      rec!.stop();
    });
    const type = (rec.mimeType || mime || "video/webm").split(";")[0];
    if (!opts.signal?.aborted && chunks.length) out = { blob: new Blob(chunks, { type }), mime: type };
  }
  try {
    src?.stop();
  } catch {
    // already finished
  }
  await ac.close().catch(() => undefined);
  return out;
}
