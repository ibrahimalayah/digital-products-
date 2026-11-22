import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { leadsCsv, listLeads } from "@/server/leads";

/** Owner: the list, or a CSV download with ?format=csv. */
export const GET = route(async (req) => {
  const user = await requireUser();
  const rows = await listLeads(user.id);
  if (new URL(req.url).searchParams.get("format") !== "csv") return { leads: rows };
  await rateLimit(`leads-export:${user.id}`, 10, 60);
  return new Response(leadsCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="leads.csv"', "Cache-Control": "private, no-store" },
  });
});
