import { route } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { addStarterProduct } from "@/server/starter";

// Owner only: puts the built-in, finished starter product on the owner's shelf.
export const POST = route(async () => {
  const admin = await requireAdmin();
  const product = await addStarterProduct(admin);
  return { product: { id: product.id } };
});
