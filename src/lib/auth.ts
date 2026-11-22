import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { appUrl, authSecret } from "./env";

const create = () =>
  betterAuth({
  baseURL: appUrl(),
  // The site answers on its main address and on the addresses Vercel assigns.
  trustedOrigins: [appUrl(), process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`, "https://digital-products-zeta.vercel.app"].filter((o): o is string => Boolean(o)),
  secret: authSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // input: false → these can never be set from sign-up or profile updates.
      role: { type: "string", defaultValue: "user", input: false },
      plan: { type: "string", defaultValue: "free", input: false },
      suspended: { type: "boolean", defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});

type Auth = ReturnType<typeof create>;
let instance: Auth | null = null;

/** Created on first use so that builds never need runtime secrets. */
export function getAuth(): Auth {
  return (instance ??= create());
}
