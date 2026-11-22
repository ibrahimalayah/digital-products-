import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { listLeads } from "@/server/leads";
import { AButton, Empty, LinkButton, PageHeader } from "@/components/ui";
import { LeadsTable } from "@/components/studio/leads-table";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Leads" };

export default async function Leads() {
  const user = await requireUserPage("/app/leads");
  const rows = await listLeads(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Leads"
        title="People who asked to hear more"
        description="Visitors who left their email on one of your product pages. They agreed to be emailed about that product only. Remove anyone who asks you to."
        actions={
          rows.length ? (
            <AButton href="/api/leads?format=csv" variant="secondary">
              <Download className="size-4" aria-hidden /> Download CSV
            </AButton>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <Empty
          title="No leads yet"
          body="Every published product page has a “Keep me posted” form. Send people there with a lead video or a campaign and they appear here."
          action={<LinkButton href="/app/videos">Make a lead video</LinkButton>}
        />
      ) : (
        <LeadsTable initial={rows.map((r) => ({ id: r.id, email: r.email, productTitle: r.productTitle, when: dateTime(r.createdAt) }))} />
      )}
    </>
  );
}
