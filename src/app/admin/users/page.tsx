import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { adminUsers } from "@/server/admin";
import { PageHeader } from "@/components/ui";
import { UsersTable } from "@/components/admin";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsers() {
  const me = await requireAdminPage();
  const users = await adminUsers();
  return (
    <>
      <PageHeader eyebrow="Control panel" title="Users" description="Change a plan by hand, grant admin access, or suspend an account. Suspending signs the user out everywhere." />
      <UsersTable selfId={me.id} users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />
    </>
  );
}
