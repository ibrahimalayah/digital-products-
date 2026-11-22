import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Create your studio") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const t = await getT();
  return (
    <>
      <h1 className="font-display text-4xl leading-none">{t("Create your studio")}</h1>
      <p className="mb-6 mt-2 text-sm text-muted">{t("Free plan. No card needed.")}</p>
      <AuthForm mode="sign-up" next={next} />
    </>
  );
}
