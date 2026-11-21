export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError(401, "unauthorized", "Sign in to continue.");
export const forbidden = (m = "You do not have access to this.") => new AppError(403, "forbidden", m);
export const notFound = (what = "Item") => new AppError(404, "not_found", `${what} was not found.`);
export const badRequest = (m: string) => new AppError(400, "bad_request", m);
export const limitReached = (m: string) => new AppError(402, "limit_reached", m);
export const tooMany = () => new AppError(429, "rate_limited", "Too many requests. Wait a moment and try again.");
export const notConfigured = (m: string) => new AppError(503, "not_configured", m);
