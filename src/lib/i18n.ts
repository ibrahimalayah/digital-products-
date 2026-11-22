// Interface translation. The English text is the key: t("Save changes") returns
// the visitor's language, or the English itself when no translation exists.
// Dictionaries live in src/i18n/<language>.json; `npm run i18n` lists every key.

export type Vars = Record<string, string | number>;
export type Dict = Record<string, string>;
export type T = (text: string, vars?: Vars) => string;

/** Fills {name} placeholders. Unknown placeholders are left as written. */
export function fill(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

export function makeT(dict: Dict | undefined): T {
  return (text, vars) => fill(dict?.[text] || text, vars);
}

/**
 * Marks text that is defined outside a component (a list of menu items, a plan
 * name) so the key collector finds it. It returns the text unchanged; pass it
 * through t() where it is shown.
 */
export const msg = (text: string) => text;
