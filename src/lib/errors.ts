import { fill, msg, type T, type Vars } from "./i18n";

export { msg };

/** A placeholder value that is itself interface text (a plan name) and is translated with the sentence. */
export type Translatable = { translate: string };
export type ErrorVars = Record<string, string | number | Translatable>;
export const tr = (text: string): Translatable => ({ translate: text });

function resolve(vars: ErrorVars | undefined, t?: T): Vars | undefined {
  if (!vars) return undefined;
  const out: Vars = {};
  for (const [k, v] of Object.entries(vars)) out[k] = typeof v === "object" ? (t ? t(v.translate) : v.translate) : v;
  return out;
}

/**
 * An error whose message is shown to the visitor. `message` is the English
 * sentence (marked with msg() where it is thrown) with {placeholders} filled
 * from `vars`; `.message` is always the English, and route() answers with
 * `.localized(t)` in the visitor's language.
 */
export class AppError extends Error {
  readonly key: string;
  readonly vars?: ErrorVars;
  constructor(
    public status: number,
    public code: string,
    message: string,
    vars?: ErrorVars,
  ) {
    super(fill(message, resolve(vars)));
    this.key = message;
    this.vars = vars;
  }

  localized(t: T) {
    return t(this.key, resolve(this.vars, t));
  }
}

const NOT_FOUND: Record<string, string> = {
  Item: msg("Item was not found."),
  Product: msg("Product was not found."),
  User: msg("User was not found."),
  Video: msg("Video was not found."),
  Idea: msg("Idea was not found."),
  Campaign: msg("Campaign was not found."),
  Post: msg("Post was not found."),
};

export const unauthorized = () => new AppError(401, "unauthorized", msg("Sign in to continue."));
export const forbidden = (m = msg("You do not have access to this."), vars?: ErrorVars) => new AppError(403, "forbidden", m, vars);
export const notFound = (what = "Item") =>
  NOT_FOUND[what] ? new AppError(404, "not_found", NOT_FOUND[what]) : new AppError(404, "not_found", msg("{what} was not found."), { what });
export const badRequest = (m: string, vars?: ErrorVars) => new AppError(400, "bad_request", m, vars);
export const limitReached = (m: string, vars?: ErrorVars) => new AppError(402, "limit_reached", m, vars);
export const tooMany = () => new AppError(429, "rate_limited", msg("Too many requests. Wait a moment and try again."));
export const notConfigured = (m: string, vars?: ErrorVars) => new AppError(503, "not_configured", m, vars);
