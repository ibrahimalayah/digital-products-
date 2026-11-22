// Voices of Kokoro-82M, the open-source speech model that runs in the browser.
// "none" makes a captions-only video.
export const VOICES = [
  { id: "af_heart", label: "Heart · US, female, warm" },
  { id: "af_bella", label: "Bella · US, female, bright" },
  { id: "am_michael", label: "Michael · US, male, calm" },
  { id: "am_fenrir", label: "Fenrir · US, male, energetic" },
  { id: "bf_emma", label: "Emma · UK, female" },
  { id: "bm_george", label: "George · UK, male" },
  { id: "none", label: "No voice · captions only" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];
export const VOICE_IDS = VOICES.map((v) => v.id) as [VoiceId, ...VoiceId[]];
export const VIDEO_LENGTHS = [15, 30, 45] as const;
