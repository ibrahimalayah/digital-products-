import type { Metadata } from "next";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { Shell } from "@/components/studio/shell";

// Signed-in pages are always rendered per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Kitforge" }, robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return <Shell user={{ name: user.name, email: user.email, plan: getPlan(user.plan).name, admin: user.role === "admin", upgrade: user.plan === "free" }}>{children}</Shell>;
}
