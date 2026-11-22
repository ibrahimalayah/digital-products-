export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** The Intl locale for an interface language id. English stays "en-US" so its output never changes. */
const locale = (lang?: string) => (!lang || lang === "en" ? "en-US" : lang);

/** `lang` is the visitor's language id (from getI18n() / useLang()); English when omitted. */
export function shortDate(d: Date | string, lang?: string) {
  return new Intl.DateTimeFormat(locale(lang), { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(d));
}

export function dateTime(d: Date | string, lang?: string) {
  return new Intl.DateTimeFormat(locale(lang), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(d));
}
