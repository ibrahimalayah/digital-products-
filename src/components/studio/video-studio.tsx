"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Play, Square, Trash2, Upload, Video as VideoIcon } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { Button, Card, Field, Input, Notice, Select, Textarea, buttonClass } from "@/components/ui";
import { VOICES } from "@/lib/voices";
import { useT } from "@/components/i18n";
import type { VideoScene } from "@/lib/types";
import type { Clip } from "@/lib/voice";
import { H, W, drawFrame, mix, play, timeline, type Frame } from "@/lib/video-render";

type Presenter = { el: HTMLImageElement | HTMLVideoElement; w: number; h: number; name: string; url: string };
type Result = { url: string; ext: string; mb: string };

export function VideoStudio({
  video,
  product,
  english,
  brand,
  link,
  cta,
  postText,
}: {
  english: boolean;
  video: { id: string; title: string; voice: string; scenes: VideoScene[] };
  product: { title: string; accent: string; published: boolean };
  brand: string;
  link: string;
  cta: string;
  postText: string;
}) {
  const router = useRouter();
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const displayFont = useRef<HTMLSpanElement>(null);
  const clips = useRef(new Map<string, Clip>());
  const stopper = useRef<AbortController | null>(null);

  const [scenes, setScenes] = useState(video.scenes);
  const [voice, setVoice] = useState(english ? video.voice : "none");
  const [presenter, setPresenter] = useState<Presenter | null>(null);
  const [phase, setPhase] = useState<"idle" | "voice" | "preview" | "recording">("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);

  const frame = useCallback(
    (): Frame => ({
      scenes,
      brand,
      productTitle: product.title,
      cta,
      link,
      accent: product.accent,
      presenter: presenter?.el ?? null,
      presenterSize: presenter ? { w: presenter.w, h: presenter.h } : null,
      aiVoice: voice !== "none",
      fontSans: getComputedStyle(document.body).fontFamily,
      fontDisplay: displayFont.current ? getComputedStyle(displayFont.current).fontFamily : "Georgia, serif",
    }),
    [scenes, brand, product.title, product.accent, cta, link, presenter, voice],
  );

  // A still of the first scene whenever nothing is playing.
  const still = useCallback(() => {
    const c = canvas.current?.getContext("2d");
    if (!c) return;
    const tl = timeline(scenes, scenes.map(() => null));
    drawFrame(c, frame(), tl, tl.durs[0] * 0.9, 0);
  }, [scenes, frame]);

  useEffect(() => {
    if (phase !== "idle") return;
    still();
    // Web fonts may arrive after the first paint.
    document.fonts?.ready.then(() => still()).catch(() => undefined);
  }, [phase, still]);

  useEffect(() => () => stopper.current?.abort(), []);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (presenter) URL.revokeObjectURL(presenter.url);
    const url = URL.createObjectURL(file);
    try {
      if (file.type.startsWith("video/")) {
        const v = document.createElement("video");
        v.src = url;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        await new Promise<void>((ok, bad) => {
          v.onloadeddata = () => ok();
          v.onerror = () => bad(new Error("unreadable"));
        });
        await v.play().catch(() => undefined);
        setPresenter({ el: v, w: v.videoWidth, h: v.videoHeight, name: file.name, url });
      } else {
        const img = new Image();
        img.src = url;
        await img.decode();
        setPresenter({ el: img, w: img.naturalWidth, h: img.naturalHeight, name: file.name, url });
      }
    } catch {
      URL.revokeObjectURL(url);
      setError(t("That file could not be opened. Use a JPG or PNG photo, or an MP4 clip."));
    }
  }

  function edit(i: number, key: keyof VideoScene, value: string) {
    setScenes((prev) => prev.map((s, n) => (n === i ? { ...s, [key]: value } : s)));
    setSaved(false);
  }

  async function save() {
    setError(null);
    try {
      await api(`/api/videos/${video.id}`, { method: "PATCH", body: { scenes, voice } });
      setSaved(true);
    } catch (err) {
      setError(t(errorMessage(err)));
    }
  }

  async function run(record: boolean) {
    const c = canvas.current;
    if (!c) return;
    setError(null);
    if (record) setResult(null);
    const abort = new AbortController();
    stopper.current = abort;
    const spoken: (Clip | null)[] = scenes.map(() => null);
    try {
      if (voice !== "none") {
        setPhase("voice");
        const { speak } = await import("@/lib/voice");
        for (let i = 0; i < scenes.length; i++) {
          if (abort.signal.aborted) return;
          const key = `${voice}|${scenes[i].narration}`;
          let clip = clips.current.get(key);
          if (!clip) {
            setStatus(t("Recording the voice: line {i} of {n}", { i: i + 1, n: scenes.length }));
            clip = await speak(scenes[i].narration, voice, (pct) => setStatus(t("Downloading the voice model: {pct}% (first time only, about 90 MB)", { pct })));
            clips.current.set(key, clip);
          }
          spoken[i] = clip;
        }
      }
    } catch (err) {
      console.error("[voice]", err);
      setError(t('The voice could not load on this device. Try again, or choose "No voice" to make a captions-only video.'));
      setPhase("idle");
      return;
    }
    if (abort.signal.aborted) return setPhase("idle");
    const tl = timeline(scenes, spoken);
    setPhase(record ? "recording" : "preview");
    setStatus(record ? t("Recording {n} seconds. Keep this tab open and in front.", { n: Math.round(tl.total) }) : t("Playing the preview"));
    try {
      const out = await play(c, frame(), tl, mix(spoken, tl), {
        record,
        signal: abort.signal,
        onTime: (x) => {
          if (bar.current) bar.current.style.width = `${Math.round(x * 100)}%`;
        },
      });
      if (out) {
        const ext = out.mime.includes("mp4") ? "mp4" : "webm";
        setResult({ url: URL.createObjectURL(out.blob), ext, mb: (out.blob.size / 1_048_576).toFixed(1) });
      }
    } catch (err) {
      console.error("[video]", err);
      setError(t("This browser could not record the video. Use a current version of Chrome, Edge or Safari."));
    }
    if (bar.current) bar.current.style.width = "0%";
    setPhase("idle");
  }

  async function remove() {
    if (!window.confirm(t("Delete this video script?"))) return;
    await api(`/api/videos/${video.id}`, { method: "DELETE" }).catch(() => undefined);
    router.push("/app/videos");
    router.refresh();
  }

  const busy = phase !== "idle";
  const fileName = useMemo(() => video.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "video", [video.title]);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-line bg-ink">
          <canvas ref={canvas} width={W} height={H} className="block aspect-[9/16] w-full" aria-label={t("Video preview")} />
          <div className="h-1 bg-sunken">
            <div ref={bar} className="h-full bg-accent" style={{ width: "0%" }} />
          </div>
        </div>
        <span ref={displayFont} className="font-display sr-only" aria-hidden>
          .
        </span>
        <div className="mt-4 flex flex-wrap gap-2">
          {busy ? (
            <Button variant="secondary" onClick={() => stopper.current?.abort()}>
              <Square className="size-4" aria-hidden /> {t("Stop")}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => run(false)}>
                <Play className="size-4" aria-hidden /> {t("Preview")}
              </Button>
              <Button onClick={() => run(true)}>
                <VideoIcon className="size-4" aria-hidden /> {t("Create video")}
              </Button>
            </>
          )}
        </div>
        {busy ? (
          <p className="mt-3 animate-pulse text-sm text-muted" role="status">
            {status}
          </p>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Notice>{error}</Notice>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        {result ? (
          <Card className="p-6">
            <h2 className="font-display text-2xl">{t("Your video is ready")}</h2>
            <p className="mt-1 text-sm text-muted">
              {t("{format}, {size} MB, 720 × 1280. It was made on this device and has not been uploaded anywhere.", { format: result.ext.toUpperCase(), size: result.mb })}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={result.url} download={`${fileName}.${result.ext}`} className={buttonClass("primary", "md")}>
                <Download className="size-4" aria-hidden /> {t("Download video")}
              </a>
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(postText).catch(() => undefined);
                  setCopied(true);
                }}
              >
                {t(copied ? "Copied" : "Copy post text")}
              </Button>
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-sunken p-4 text-sm">{postText}</p>
            <p className="mt-3 text-xs text-muted">
              {t("Upload the file to TikTok, Instagram Reels or YouTube Shorts and paste the text.")}
              {result.ext === "webm" ? <> {t("This browser saved WebM; for MP4, which every network accepts, use a current Chrome, Edge or Safari.")}</> : null}
              {product.published ? null : <> {t("Publish the product first so the link works.")}</>}
            </p>
          </Card>
        ) : null}

        <Card className="p-6">
          <h2 className="font-display text-2xl">{t("Presenter")}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("Add a photo or a short clip of the person who fronts your brand. It fills the frame behind the captions and moves gently with the voice. The file stays on this device. Use only yourself or someone who has agreed to appear.")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className={buttonClass("secondary", "md", "cursor-pointer")}>
              <Upload className="size-4" aria-hidden /> {t(presenter ? "Change" : "Choose photo or clip")}
              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {presenter ? (
              <>
                <span className="max-w-[16rem] truncate text-sm">{presenter.name}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    URL.revokeObjectURL(presenter.url);
                    setPresenter(null);
                  }}
                >
                  {t("Remove")}
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted">{t("No presenter: the video shows your product card.")}</span>
            )}
          </div>
          <div className="mt-5 max-w-sm">
            <Field label={t("Voice")} htmlFor="voice" hint={t(english ? "Kokoro, an open-source voice that runs in your browser. Videos are marked “AI voice”." : "The built-in voice speaks English only, so this video uses captions. Record your own voice-over in your phone's editor if you want sound.")}>
              <Select
                id="voice"
                value={english ? voice : "none"}
                disabled={busy || !english}
                onChange={(e) => {
                  setVoice(e.target.value);
                  setSaved(false);
                }}
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {t(v.label)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{t("Script")}</h2>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={save} disabled={saved || busy}>
                {t(saved ? "Saved" : "Save changes")}
              </Button>
              <button onClick={remove} disabled={busy} className="p-2 text-muted hover:text-danger" aria-label={t("Delete this video")}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          <ol className="mt-4 space-y-5">
            {scenes.map((s, i) => (
              <li key={i} className="grid gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[2rem_1fr]">
                <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
                <div className="space-y-3">
                  <Field label={t("On screen")} htmlFor={`cap-${i}`}>
                    <Input id={`cap-${i}`} value={s.caption} maxLength={80} disabled={busy} onChange={(e) => edit(i, "caption", e.target.value)} />
                  </Field>
                  <Field label={t("Spoken")} htmlFor={`nar-${i}`}>
                    <Textarea id={`nar-${i}`} value={s.narration} maxLength={400} rows={2} disabled={busy} onChange={(e) => edit(i, "narration", e.target.value)} />
                  </Field>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
