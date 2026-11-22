import { dictFor } from "@/i18n";
import { makeT, type T } from "./i18n";
import type { LanguageId } from "./languages";
import { currentLanguageOrEnglish } from "./locale-server";

/** The translator for this request, for server components and API routes. English outside a request. */
export async function getT(): Promise<T> {
  return makeT(dictFor(await currentLanguageOrEnglish()));
}

/** The translator plus the language itself, for dates, numbers and text direction. */
export async function getI18n(): Promise<{ t: T; lang: LanguageId }> {
  const lang = await currentLanguageOrEnglish();
  return { t: makeT(dictFor(lang)), lang };
}
