// Voices of Kokoro-82M, the open-source speech model that runs in the browser.
// "none" makes a captions-only video.
import { msg } from "./i18n";

export const VOICES = [
  { id: "af_heart", label: msg("Heart · US, female, warm") },
  { id: "af_bella", label: msg("Bella · US, female, bright") },
  { id: "am_michael", label: msg("Michael · US, male, calm") },
  { id: "am_fenrir", label: msg("Fenrir · US, male, energetic") },
  { id: "bf_emma", label: msg("Emma · UK, female") },
  { id: "bm_george", label: msg("George · UK, male") },
  { id: "none", label: msg("No voice · captions only") },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];
export const VOICE_IDS = VOICES.map((v) => v.id) as [VoiceId, ...VoiceId[]];
export const VIDEO_LENGTHS = [15, 30, 45] as const;
