import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUserPage } from "@/lib/session";
import { Logo } from "@/components/ui";
import { ClaimAdmin } from "@/components/admin";

export const metadata: Metadata = { title: "Claim control panel", robots: { index: false } };

export default async function Claim() {
  const user = await requireUserPage("/claim");
  if (user.role === "admin") redirect("/admin");
  return (
    <main className="grain grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-3xl border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-3xl leading-none">Owner access</h1>
          <p className="mb-6 mt-2 text-sm text-muted">Enter the ADMIN_BOOTSTRAP_TOKEN set on this deployment to make {user.email} the platform owner.</p>
          <ClaimAdmin />
        </div>
      </div>
    </main>
  );
}
