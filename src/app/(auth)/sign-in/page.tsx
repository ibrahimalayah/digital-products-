import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Welcome back") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const t = await getT();
  return (
    <>
      <h1 className="font-display text-4xl leading-none">{t("Welcome back")}</h1>
      <p className="mb-6 mt-2 text-sm text-muted">{t("Sign in to your studio.")}</p>
      <AuthForm mode="sign-in" next={next} />
    </>
  );
}
