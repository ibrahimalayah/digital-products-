import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { adminUsers } from "@/server/admin";
import { getT } from "@/lib/i18n-server";
import { PageHeader } from "@/components/ui";
import { UsersTable } from "@/components/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Users") };
}

export default async function AdminUsers() {
  const t = await getT();
  const me = await requireAdminPage();
  const users = await adminUsers();
  return (
    <>
      <PageHeader eyebrow={t("Control panel")} title={t("Users")} description={t("Change a plan by hand, grant admin access, or suspend an account. Suspending signs the user out everywhere.")} />
      <UsersTable selfId={me.id} users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />
    </>
  );
}
