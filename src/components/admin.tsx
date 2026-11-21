"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Badge, Button, Input, Notice, Select } from "@/components/ui";
import { shortDate } from "@/lib/format";

export type AdminUser = { id: string; name: string; email: string; role: string; plan: string; suspended: boolean; createdAt: string };

export function UsersTable({ users, selfId }: { users: AdminUser[]; selfId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function update(id: string, body: Record<string, unknown>) {
    setError(null);
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const shown = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <label htmlFor="user-search" className="sr-only">
        Search users
      </label>
      <Input id="user-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="max-w-sm" />
      {error ? <Notice>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-muted">{shortDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <Select aria-label={`Plan for ${u.email}`} defaultValue={u.plan} onChange={(e) => update(u.id, { plan: e.target.value })} className="h-9 w-32">
                    <option value="free">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select aria-label={`Role for ${u.email}`} defaultValue={u.role} disabled={u.id === selfId} onChange={(e) => update(u.id, { role: e.target.value })} className="h-9 w-28">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  {u.id === selfId ? (
                    <Badge tone="accent">You</Badge>
                  ) : (
                    <Button size="sm" variant={u.suspended ? "secondary" : "danger"} onClick={() => update(u.id, { suspended: !u.suspended })}>
                      {u.suspended ? "Restore" : "Suspend"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UnpublishButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="danger"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await api(`/api/admin/products/${id}`, { method: "DELETE" }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
    >
      Unpublish
    </Button>
  );
}

export function RunAutopilot() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const { report } = await api<{ report: { users: number; campaigns: number; written: number; published: number; failed: number } }>("/api/agents/run", { method: "POST", body: {} });
            setMsg({ ok: true, text: `Ran for ${report.users} creator(s) and ${report.campaigns} campaign(s): ${report.written} posts written, ${report.published} scheduled, ${report.failed} failed.` });
            router.refresh();
          } catch (e) {
            setMsg({ ok: false, text: errorMessage(e) });
          } finally {
            setBusy(false);
          }
        }}
      >
        Run daily autopilot now
      </Button>
      {msg ? <Notice tone={msg.ok ? "accent" : "danger"}>{msg.text}</Notice> : null}
    </div>
  );
}

export function AddStarter() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { product } = await api<{ product: { id: string } }>("/api/admin/starter", { method: "POST", body: {} });
            router.push(`/app/products/${product.id}`);
          } catch (e) {
            setError(errorMessage(e));
            setBusy(false);
          }
        }}
      >
        Add the starter product
      </Button>
      {error ? <Notice>{error}</Notice> : null}
    </div>
  );
}

export function ClaimAdmin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/admin/claim", { body: { token: String(new FormData(e.currentTarget).get("token") ?? "") } });
          window.location.href = "/admin"; // full reload so the server re-reads the new role
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <label htmlFor="token" className="block text-[13px] font-medium">
        Owner token
      </label>
      <Input id="token" name="token" type="password" autoComplete="off" required />
      {error ? <Notice>{error}</Notice> : null}
      <Button type="submit" loading={busy}>
        Claim control panel
      </Button>
    </form>
  );
}
