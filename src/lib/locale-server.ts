import { cookies, headers } from "next/headers";
import type { LanguageId } from "./languages";
import { LANG_COOKIE, pickLanguage } from "./locale";

/** The language for this request: the visitor's saved choice, else their browser's preference. */
export async function currentLanguage(): Promise<LanguageId> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return pickLanguage(c.get(LANG_COOKIE)?.value, h.get("accept-language"));
}

/** The same, for code that may also run outside a request (scheduled jobs): English there. */
export async function currentLanguageOrEnglish(): Promise<LanguageId> {
  try {
    return await currentLanguage();
  } catch {
    return "en";
  }
}
