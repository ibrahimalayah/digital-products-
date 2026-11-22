import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUserPage } from "@/lib/session";
import { Logo } from "@/components/ui";
import { ClaimAdmin } from "@/components/admin";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Claim control panel"), robots: { index: false } };
}

export default async function Claim() {
  const user = await requireUserPage("/claim");
  if (user.role === "admin") redirect("/admin");
  const t = await getT();
  return (
    <main className="grain grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-3xl border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-3xl leading-none">{t("Owner access")}</h1>
          <p className="mb-6 mt-2 text-sm text-muted">{t("Enter the ADMIN_BOOTSTRAP_TOKEN set on this deployment to make {email} the platform owner.", { email: user.email })}</p>
          <ClaimAdmin />
        </div>
      </div>
    </main>
  );
}
