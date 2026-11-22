"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Dict, type T } from "@/lib/i18n";
import type { LanguageId } from "@/lib/languages";

const Ctx = createContext<{ lang: LanguageId; t: T }>({ lang: "en", t: makeT(undefined) });

/** Gives client components the visitor's language. Set once in the root layout. */
export function I18nProvider({ lang, dict, children }: { lang: LanguageId; dict: Dict; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(dict) }), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The translator, for client components: const t = useT(); t("Save changes"). */
export const useT = () => useContext(Ctx).t;
/** The visitor's language id, for dates and numbers. */
export const useLang = () => useContext(Ctx).lang;
