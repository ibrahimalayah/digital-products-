import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-forms";
import { Notice } from "@/components/ui";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  // The address carries a one-time token, so it is never sent on as a referrer.
  return { title: t("Choose a new password"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const t = await getT();
  return (
    <>
      <h1 className="font-display text-4xl leading-none">{t("Choose a new password")}</h1>
      <p className="mb-6 mt-2 text-sm text-muted">{t("Pick a password you do not use anywhere else.")}</p>
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <Notice>{t("This reset link is invalid or has expired. Ask for a new one.")}</Notice>
          <p className="text-center text-sm text-muted">
            <Link href="/forgot-password" className="font-medium text-ink underline underline-offset-4">
              {t("Send reset link")}
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
