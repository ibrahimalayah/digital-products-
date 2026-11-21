import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, notFound } from "@/lib/errors";
import { renderProductPdf } from "@/lib/pdf";
import { canDownload } from "@/server/products";
import { getSettings } from "@/server/settings";
import { slugify } from "@/lib/utils";

export const maxDuration = 60;

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await rateLimit(`pdf:${user.id}`, 20, 60);
  const p = await canDownload(user, id);
  if (!p) throw notFound("Product"); // same answer for "missing" and "not yours"
  if (!p.sections.filter(Boolean).length) throw badRequest("This product has no pages yet. Generate it first.");
  const owner = await getSettings(p.userId);
  const pdf = await renderProductPdf({ ...p, brand: owner.brandName || "Kitforge" });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(p.title)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
