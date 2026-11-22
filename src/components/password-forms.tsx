"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Input, Notice } from "./ui";
import { useT } from "./i18n";

const backLink = "font-medium text-ink underline underline-offset-4";

/** Asks for the account's email and sends a reset link. Says the same thing whether or not the account exists. */
export function ForgotPasswordForm() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setError(null);
    setLoading(true);
    const res = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    if (res.error) setError(t("Could not send the link. Try again in a minute."));
    else setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {sent ? (
        <Notice tone="accent">{t("If an account exists for that address, a reset link is on its way. It works for one hour.")}</Notice>
      ) : (
        <>
          <Field label={t("Email")} htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          {error ? <Notice>{error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {t("Send reset link")}
          </Button>
        </>
      )}
      <p className="text-center text-sm text-muted">
        <Link href="/sign-in" className={backLink}>
          {t("Back to sign in")}
        </Link>
      </p>
    </form>
  );
}

/** Sets a new password with the token from the emailed link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newPassword = String(new FormData(e.currentTarget).get("password") ?? "");
    setError(null);
    setLoading(true);
    const res = await authClient.resetPassword({ newPassword, token });
    setLoading(false);
    if (res.error) setError(t("Could not change the password. Ask for a new link."));
    else setDone(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {done ? (
        <Notice tone="accent">{t("Password changed. You can sign in now.")}</Notice>
      ) : (
        <>
          <Field label={t("New password")} htmlFor="password" hint={t("At least 10 characters.")}>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
          </Field>
          {error ? <Notice>{error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {t("Save new password")}
          </Button>
        </>
      )}
      <p className="text-center text-sm text-muted">
        <Link href={error ? "/forgot-password" : "/sign-in"} className={backLink}>
          {t(error ? "Send reset link" : "Back to sign in")}
        </Link>
      </p>
    </form>
  );
}
