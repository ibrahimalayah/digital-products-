"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Input, Notice } from "./ui";
import { safeNext } from "@/lib/safe-next";
import { useT } from "./i18n";


export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dest = safeNext(next, typeof window === "undefined" ? undefined : window.location.origin);
  const signUp = mode === "sign-up";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const name = String(f.get("name") ?? "").trim();
    setError(null);
    setLoading(true);
    const res = signUp ? await authClient.signUp.email({ email, password, name }) : await authClient.signIn.email({ email, password });
    if (res.error) {
      setError(res.error.message || t(signUp ? "Could not create the account." : "Email or password is incorrect."));
      setLoading(false);
      return;
    }
    window.location.assign(dest);
  }

  const other = signUp ? "/sign-in" : "/sign-up";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {signUp ? (
        <Field label={t("Name")} htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required maxLength={80} />
        </Field>
      ) : null}
      <Field label={t("Email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t("Password")} htmlFor="password" hint={signUp ? t("At least 10 characters.") : undefined}>
        <Input id="password" name="password" type="password" autoComplete={signUp ? "new-password" : "current-password"} required minLength={signUp ? 10 : 1} maxLength={128} />
      </Field>
      {error ? <Notice>{error}</Notice> : null}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {t(signUp ? "Create account" : "Sign in")}
      </Button>
      <p className="text-center text-sm text-muted">
        {t(signUp ? "Already have an account?" : "New here?")}{" "}
        <Link href={next ? `${other}?next=${encodeURIComponent(dest)}` : other} className="font-medium text-ink underline underline-offset-4">
          {t(signUp ? "Sign in" : "Create an account")}
        </Link>
      </p>
    </form>
  );
}
