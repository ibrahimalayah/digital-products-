import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { appUrl, authSecret } from "./env";
import { emailReady, linkEmail, sendEmail } from "./email";
import { getI18n } from "./i18n-server";
import { isRtl } from "./languages";

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
    // The emailed link works once, for an hour, and signs every device out when used.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (!emailReady()) {
        console.warn("[auth] password reset requested but no email service is configured");
        return;
      }
      const { t, lang } = await getI18n();
      const { text, html } = linkEmail({
        greeting: t("Hi {name},", { name: user.name || user.email }),
        intro: t("Use this link to choose a new password. It works for one hour and can be used once:"),
        button: t("Choose a new password"),
        url,
        outro: t("If you did not ask for this, you can ignore this email. Your password stays the same."),
        rtl: isRtl(lang),
      });
      try {
        await sendEmail({ to: user.email, subject: t("Reset your Kitforge password"), text, html });
      } catch (e) {
        // Never tell the visitor whether sending worked: that would reveal which addresses have accounts.
        console.error("[auth] could not send the password reset email:", e instanceof Error ? e.message : e);
      }
    },
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
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
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
