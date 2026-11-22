"use client";
// Speech for videos, made in the visitor's own browser by Kokoro-82M, an
// open-source (Apache-2.0) model. Nothing is sent to a speech service and no
// key is needed. The model (about 90 MB) downloads once from Hugging Face and
// is then kept in the browser's cache.

export type Clip = { samples: Float32Array; rate: number };

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

type Speaker = { generate(text: string, opts: { voice: string }): Promise<{ audio: Float32Array; sampling_rate: number }> };

let loading: Promise<Speaker> | null = null;

/** Loads the model once per page. `onProgress` reports the download in percent. */
export function loadVoice(onProgress?: (percent: number) => void): Promise<Speaker> {
  if (!loading) {
    loading = (async () => {
      const { KokoroTTS, env } = await import("kokoro-js");
      // The runtime files are served by this site (copied in by scripts/voice-assets.mjs).
      env.wasmPaths = "/voice/";
      const tts = await KokoroTTS.from_pretrained(MODEL, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (p: { status?: string; file?: string; progress?: number }) => {
          if (p.status === "progress" && p.file?.endsWith(".onnx") && typeof p.progress === "number") onProgress?.(Math.round(p.progress));
        },
      });
      return tts as unknown as Speaker;
    })();
    // A failed load can be tried again.
    loading.catch(() => (loading = null));
  }
  return loading;
}

export async function speak(text: string, voice: string, onProgress?: (percent: number) => void): Promise<Clip> {
  const tts = await loadVoice(onProgress);
  const out = await tts.generate(text, { voice });
  return { samples: out.audio, rate: out.sampling_rate };
}
