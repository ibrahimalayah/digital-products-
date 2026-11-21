import { db, dbReady, schema } from "@/db";
import { newId } from "@/lib/utils";
import type { CurrentUser } from "@/lib/session";

export async function makeUser(over: Partial<CurrentUser> = {}): Promise<CurrentUser> {
  await dbReady();
  const id = newId("usr");
  const [u] = await db
    .insert(schema.user)
    .values({ id, name: "Test User", email: `${id}@example.test`, ...over })
    .returning();
  return u;
}
