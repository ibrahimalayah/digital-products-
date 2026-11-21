import { describe, expect, it } from "vitest";
import { canDownload, createProduct, deleteProduct, generateOutline, generateSection, getOwnedProduct, listStore, updateProduct } from "@/server/products";
import { runIdeaResearch, listIdeas } from "@/server/ideas";
import { renderProductPdf } from "@/lib/pdf";
import { db, schema } from "@/db";
import { newId } from "@/lib/utils";
import { makeUser } from "./helpers";

const brief = { title: "Puppy Potty Plan", promise: "A calm, house-trained puppy in 28 days.", audience: "New puppy owners", format: "4 weekly guides and a tracker" };

async function buildReady(user: Awaited<ReturnType<typeof makeUser>>) {
  const p = await createProduct(user, brief);
  let cur = await generateOutline(user, p.id);
  for (let i = 0; i < cur.outline!.sections.length; i++) cur = await generateSection(user, p.id, i);
  return cur;
}

describe("idea research", () => {
  it("stores ideas for the owner only and counts usage", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const ideas = await runIdeaResearch(a, "puppy training");
    expect(ideas.length).toBeGreaterThan(0);
    expect(await listIdeas(b.id)).toHaveLength(0);
    expect((await listIdeas(a.id)).length).toBe(ideas.length);
  });
});

describe("product generation", () => {
  it("goes draft → generating → ready and renders a PDF", async () => {
    const user = await makeUser();
    const p = await createProduct(user, brief);
    expect(p.status).toBe("draft");
    expect(p.slug).toMatch(/^puppy-potty-plan-[a-z0-9]{6}$/);
    const outlined = await generateOutline(user, p.id);
    expect(outlined.status).toBe("generating");
    const ready = await buildReady(user).catch(() => null); // second product exceeds the free quota
    expect(ready).toBeNull();
    let cur = outlined;
    for (let i = 0; i < cur.outline!.sections.length; i++) cur = await generateSection(user, p.id, i);
    expect(cur.status).toBe("ready");
    const pdf = await renderProductPdf({ ...cur, brand: "Test Brand" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(3000);
  });

  it("writes each section once per outline, so AI use stays metered", async () => {
    const user = await makeUser();
    const p = await createProduct(user, brief);
    await generateOutline(user, p.id);
    await generateSection(user, p.id, 0);
    await expect(generateSection(user, p.id, 0)).rejects.toMatchObject({ status: 400 });
    let cur = await generateSection(user, p.id, 1);
    expect(cur.status).toBe("ready");
    await expect(generateSection(user, p.id, 1)).rejects.toMatchObject({ status: 400 });
    // A rewrite needs a new outline, which the free plan's single credit no longer covers.
    await expect(generateOutline(user, p.id)).rejects.toMatchObject({ status: 402 });
    cur = await (await import("@/server/products")).getOwnedProduct(user.id, p.id);
    expect(cur.status).toBe("ready");
  });

  it("rejects out-of-range sections", async () => {
    const user = await makeUser();
    const p = await createProduct(user, brief);
    await expect(generateSection(user, p.id, 0)).rejects.toMatchObject({ status: 400 });
    await generateOutline(user, p.id);
    await expect(generateSection(user, p.id, 99)).rejects.toMatchObject({ status: 400 });
  });
});

describe("access control", () => {
  it("hides products from other users", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const p = await createProduct(owner, brief);
    await expect(getOwnedProduct(other.id, p.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateProduct(other, p.id, { title: "Hijacked" })).rejects.toMatchObject({ status: 404 });
    await expect(generateOutline(other, p.id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteProduct(other, p.id)).rejects.toMatchObject({ status: 404 });
    expect(await canDownload(other, p.id)).toBeNull();
    expect(await canDownload(owner, p.id)).not.toBeNull();
  });

  it("lets only admins publish, and only finished products", async () => {
    const creator = await makeUser({ plan: "pro" });
    const admin = await makeUser({ role: "admin", plan: "business" });
    const mine = await buildReady(creator);
    await expect(updateProduct(creator, mine.id, { published: true })).rejects.toMatchObject({ status: 403 });

    const draft = await createProduct(admin, brief);
    await expect(updateProduct(admin, draft.id, { published: true })).rejects.toMatchObject({ status: 400 });

    const ready = await buildReady(admin);
    const live = await updateProduct(admin, ready.id, { published: true });
    expect(live.status).toBe("published");
    expect((await listStore()).map((s) => s.id)).toContain(ready.id);
    // Published products cannot be regenerated out from under buyers.
    await expect(generateOutline(admin, ready.id)).rejects.toMatchObject({ status: 400 });
  });

  it("grants downloads to paying buyers and blocks deleting sold products", async () => {
    const admin = await makeUser({ role: "admin", plan: "business" });
    const buyer = await makeUser();
    const stranger = await makeUser();
    const p = await buildReady(admin);
    await db.insert(schema.orders).values({ id: newId("ord"), userId: buyer.id, productId: p.id, amountCents: 900, stripeSessionId: newId("cs") });
    expect(await canDownload(buyer, p.id)).not.toBeNull();
    expect(await canDownload(stranger, p.id)).toBeNull();
    await expect(deleteProduct(admin, p.id)).rejects.toMatchObject({ status: 400 });
  });

  it("revokes downloads after a refund", async () => {
    const admin = await makeUser({ role: "admin", plan: "business" });
    const buyer = await makeUser();
    const p = await buildReady(admin);
    await db.insert(schema.orders).values({ id: newId("ord"), userId: buyer.id, productId: p.id, amountCents: 900, stripeSessionId: newId("cs"), status: "refunded" });
    expect(await canDownload(buyer, p.id)).toBeNull();
  });
});
