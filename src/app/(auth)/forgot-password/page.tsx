import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/password-forms";
import { Notice } from "@/components/ui";
import { emailReady } from "@/lib/email";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Reset your password"), robots: { index: false } };
}

export default async function Page() {
  const t = await getT();
  return (
    <>
      <h1 className="font-display text-4xl leading-none">{t("Reset your password")}</h1>
      <p className="mb-6 mt-2 text-sm text-muted">{t("Enter your email and we will send you a link to choose a new password.")}</p>
      {emailReady() ? (
        <ForgotPasswordForm />
      ) : (
        <div className="space-y-4">
          <Notice>{t("Password reset by email is not switched on for this site yet.")}</Notice>
          <p className="text-center text-sm text-muted">
            <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
              {t("Back to sign in")}
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
