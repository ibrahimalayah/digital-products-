"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { Card } from "@/components/ui";

type Lead = { id: string; email: string; productTitle: string; when: string };

export function LeadsTable({ initial }: { initial: Lead[] }) {
  const [rows, setRows] = useState(initial);

  async function remove(id: string) {
    const before = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));
    await api(`/api/leads/${id}`, { method: "DELETE" }).catch(() => setRows(before));
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-sunken text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium max-sm:hidden">Product</th>
            <th className="px-5 py-3 font-medium max-sm:hidden">Signed up</th>
            <th className="px-5 py-3">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="break-all px-5 py-3">{r.email}</td>
              <td className="px-5 py-3 text-muted max-sm:hidden">{r.productTitle}</td>
              <td className="px-5 py-3 text-muted max-sm:hidden">{r.when}</td>
              <td className="px-5 py-3 text-right">
                <button onClick={() => remove(r.id)} className="text-muted hover:text-danger" aria-label={`Remove ${r.email}`}>
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
