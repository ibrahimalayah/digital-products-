import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, schema } from "@/db";
import { applyStripeEvent } from "@/server/billing";
import { createProduct, canDownload } from "@/server/products";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { GET as cron } from "@/app/api/cron/daily/route";
import { newId } from "@/lib/utils";
import { makeUser } from "./helpers";

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, set: () => undefined }) }));

// Only the session lookup used by refund and dispute handling is stubbed; signature checks stay real.
const stripeList = vi.fn();
vi.mock("@/lib/stripe", async () => {
  const { default: Stripe } = await import("stripe");
  const real = new Stripe("sk_test_unit_only");
  return { stripe: () => ({ webhooks: real.webhooks, checkout: { sessions: { list: stripeList } } }) };
});

const event = (type: string, object: Record<string, unknown>, id = newId("evt")) => ({ id, type, data: { object } }) as unknown as Stripe.Event;
const brief = { title: "Kit", promise: "A clear result in a week.", audience: "Busy people", format: "Templates" };

describe("stripe events", () => {
  it("records a paid order once, however often Stripe retries", async () => {
    const seller = await makeUser({ role: "admin" });
    const buyer = await makeUser();
    const p = await createProduct(seller, brief);
    const session = { id: newId("cs"), payment_status: "paid", amount_total: 900, currency: "usd", metadata: { kind: "product", productId: p.id, userId: buyer.id } };
    const e = event("checkout.session.completed", session);
    expect(await applyStripeEvent(e)).toBe("applied");
    expect(await applyStripeEvent(e)).toBe("duplicate");
    // A different event id for the same checkout session must not create a second order.
    expect(await applyStripeEvent(event("checkout.session.completed", session))).toBe("applied");
    const orders = await db.select().from(schema.orders).where(eq(schema.orders.productId, p.id));
    expect(orders).toHaveLength(1);
    expect(orders[0].amountCents).toBe(900);
    const [fresh] = await db.select().from(schema.products).where(eq(schema.products.id, p.id));
    expect(fresh.salesCount).toBe(1);
    expect(await canDownload(buyer, p.id)).not.toBeNull();
  });

  it("ends access when the buyer files a chargeback", async () => {
    const seller = await makeUser({ role: "admin" });
    const buyer = await makeUser();
    const p = await createProduct(seller, brief);
    const sid = newId("cs");
    await applyStripeEvent(event("checkout.session.completed", { id: sid, payment_status: "paid", amount_total: 900, currency: "usd", metadata: { kind: "product", productId: p.id, userId: buyer.id } }));
    expect(await canDownload(buyer, p.id)).not.toBeNull();
    stripeList.mockResolvedValueOnce({ data: [{ id: sid }] });
    expect(await applyStripeEvent(event("charge.dispute.created", { id: "dp_1", payment_intent: "pi_1" }))).toBe("applied");
    expect(stripeList).toHaveBeenCalledWith({ payment_intent: "pi_1", limit: 1 });
    expect(await canDownload(buyer, p.id)).toBeNull();
  });

  it("ignores unpaid sessions", async () => {
    const seller = await makeUser();
    const buyer = await makeUser();
    const p = await createProduct(seller, brief);
    const r = await applyStripeEvent(event("checkout.session.completed", { id: newId("cs"), payment_status: "unpaid", metadata: { kind: "product", productId: p.id, userId: buyer.id } }));
    expect(r).toBe("ignored");
    expect(await canDownload(buyer, p.id)).toBeNull();
  });

  it("upgrades on subscription checkout and downgrades on cancellation", async () => {
    const u = await makeUser();
    await applyStripeEvent(event("checkout.session.completed", { id: newId("cs"), payment_status: "paid", customer: "cus_1", subscription: "sub_1", metadata: { kind: "plan", plan: "pro", userId: u.id } }));
    const get = async () => (await db.select().from(schema.user).where(eq(schema.user.id, u.id)))[0];
    expect(await get()).toMatchObject({ plan: "pro", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" });

    await applyStripeEvent(event("customer.subscription.updated", { id: "sub_1", status: "active", metadata: { plan: "business" }, items: { data: [{ current_period_end: 1_900_000_000 }] } }));
    expect((await get()).plan).toBe("business");
    expect((await get()).planRenewsAt?.getTime()).toBe(1_900_000_000_000);

    await applyStripeEvent(event("customer.subscription.deleted", { id: "sub_1", status: "canceled", metadata: { plan: "business" } }));
    expect(await get()).toMatchObject({ plan: "free", stripeSubscriptionId: null });
  });

  it("does not grant a plan before payment has arrived", async () => {
    const u = await makeUser();
    const r = await applyStripeEvent(event("checkout.session.completed", { id: newId("cs"), payment_status: "unpaid", customer: "cus_2", subscription: "sub_2", metadata: { kind: "plan", plan: "business", userId: u.id } }));
    expect(r).toBe("ignored");
    expect((await db.select().from(schema.user).where(eq(schema.user.id, u.id)))[0].plan).toBe("free");
  });

  it("lets Stripe retry an event whose processing failed", async () => {
    const buyer = await makeUser();
    const e = event("checkout.session.completed", { id: newId("cs"), payment_status: "paid", amount_total: 900, metadata: { kind: "product", productId: "prod_missing", userId: buyer.id } });
    await expect(applyStripeEvent(e)).rejects.toThrow(); // foreign key: product does not exist
    await expect(applyStripeEvent(e)).rejects.toThrow(); // not swallowed as a duplicate
  });

  it("rejects plan names it does not know", async () => {
    const u = await makeUser();
    const r = await applyStripeEvent(event("checkout.session.completed", { id: newId("cs"), payment_status: "paid", metadata: { kind: "plan", plan: "enterprise-free-forever", userId: u.id } }));
    expect(r).toBe("ignored");
    expect((await db.select().from(schema.user).where(eq(schema.user.id, u.id)))[0].plan).toBe("free");
  });
});

describe("webhook endpoint", () => {
  const secret = "whsec_unit_only_secret";
  const stripe = new Stripe("sk_test_unit_only");
  const post = (body: string, sig?: string) =>
    webhook(new Request("http://localhost:3000/api/stripe/webhook", { method: "POST", body, headers: sig ? { "stripe-signature": sig } : {} }));

  it("rejects missing and forged signatures", async () => {
    const body = JSON.stringify({ id: "evt_forged", type: "checkout.session.completed", data: { object: {} } });
    expect((await post(body)).status).toBe(400);
    expect((await post(body, "t=1,v1=deadbeef")).status).toBe(400);
    const wrong = stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_other" });
    expect((await post(body, wrong)).status).toBe(400);
  });

  it("accepts a correctly signed event and applies it", async () => {
    const u = await makeUser();
    const body = JSON.stringify({ id: newId("evt"), object: "event", type: "checkout.session.completed", data: { object: { id: newId("cs"), payment_status: "paid", customer: "cus_9", subscription: "sub_9", metadata: { kind: "plan", plan: "pro", userId: u.id } } } });
    const sig = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    const res = await post(body, sig);
    expect(res.status).toBe(200);
    expect((await db.select().from(schema.user).where(eq(schema.user.id, u.id)))[0].plan).toBe("pro");
    // Tampering with the signed body is detected.
    expect((await post(body.replace('"pro"', '"business"'), sig)).status).toBe(400);
  });
});

describe("cron endpoint", () => {
  const call = (auth?: string) => cron(new Request("http://localhost:3000/api/cron/daily", { headers: auth ? { authorization: auth } : {} }));
  it("requires the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    const ok = await call("Bearer cron-secret-for-tests-0123456789");
    expect(ok.status).toBe(200);
    expect((await ok.json()).ok).toBe(true);
  });
});
