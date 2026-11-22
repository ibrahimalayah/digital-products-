import type Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { stripe } from "@/lib/stripe";
import { appUrl } from "@/lib/env";
import { PLANS } from "@/lib/plans";
import { badRequest, msg, notFound } from "@/lib/errors";
import { newId } from "@/lib/utils";
import { getStoreProduct } from "./products";
import type { CurrentUser } from "@/lib/session";
import type { PlanId } from "@/lib/types";

async function ensureCustomer(user: CurrentUser): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
  await db.update(schema.user).set({ stripeCustomerId: customer.id }).where(eq(schema.user.id, user.id));
  return customer.id;
}

/** One-off purchase of a store product. The price always comes from the database. */
export async function productCheckout(user: CurrentUser, slug: string): Promise<string> {
  const p = await getStoreProduct(slug);
  if (!p) throw notFound("Product");
  const [owned] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(sql`${schema.orders.userId} = ${user.id} and ${schema.orders.productId} = ${p.id} and ${schema.orders.status} = 'paid'`)
    .limit(1);
  if (owned) throw badRequest(msg("You already own this product. Find it in your library."));
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: await ensureCustomer(user),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: p.priceCents,
          product_data: { name: p.title, description: p.promise.slice(0, 300) },
        },
      },
    ],
    metadata: { kind: "product", productId: p.id, userId: user.id },
    success_url: `${appUrl()}/app/library?purchased=${encodeURIComponent(p.slug)}`,
    cancel_url: `${appUrl()}/store/${p.slug}`,
  });
  if (!session.url) throw badRequest(msg("Checkout could not be started."));
  return session.url;
}

export async function planCheckout(user: CurrentUser, planId: PlanId): Promise<string> {
  const plan = PLANS[planId];
  if (!plan || plan.priceCents <= 0) throw badRequest(msg("Pick a paid plan."));
  if (user.stripeSubscriptionId && user.plan !== "free") {
    // Existing subscribers change plan in the billing portal so they are not charged twice.
    return portalUrl(user);
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await ensureCustomer(user),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.priceCents,
          recurring: { interval: "month" },
          product_data: { name: `Kitforge ${plan.name}` },
        },
      },
    ],
    metadata: { kind: "plan", plan: plan.id, userId: user.id },
    subscription_data: { metadata: { plan: plan.id, userId: user.id } },
    success_url: `${appUrl()}/app/billing?upgraded=1`,
    cancel_url: `${appUrl()}/app/billing`,
  });
  if (!session.url) throw badRequest(msg("Checkout could not be started."));
  return session.url;
}

export async function portalUrl(user: CurrentUser): Promise<string> {
  if (!user.stripeCustomerId) throw badRequest(msg("You have no billing account yet."));
  const s = await stripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${appUrl()}/app/billing` });
  return s.url;
}

const isPlan = (v: unknown): v is PlanId => v === "pro" || v === "business";

/**
 * Applies a verified Stripe event. Idempotent: each event id is recorded and
 * replays are ignored; orders are unique per checkout session.
 */
export async function applyStripeEvent(event: Stripe.Event): Promise<"applied" | "duplicate" | "ignored"> {
  // The event id is recorded only after it has been applied, so a function that
  // dies mid-way is retried by Stripe. Every branch below is safe to replay.
  const [seen] = await db.select({ id: schema.stripeEvents.id }).from(schema.stripeEvents).where(eq(schema.stripeEvents.id, event.id)).limit(1);
  if (seen) return "duplicate";
  const result = await handle(event);
  await db.insert(schema.stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  return result;
}

async function handle(event: Stripe.Event): Promise<"applied" | "ignored"> {
  {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        const meta = s.metadata ?? {};
        if (meta.kind === "product" && meta.productId && meta.userId) {
          if (s.payment_status !== "paid") return "ignored";
          const inserted = await db
            .insert(schema.orders)
            .values({
              id: newId("ord"),
              userId: meta.userId,
              productId: meta.productId,
              amountCents: s.amount_total ?? 0,
              currency: s.currency ?? "usd",
              stripeSessionId: s.id,
            })
            .onConflictDoNothing()
            .returning({ id: schema.orders.id });
          if (inserted.length) {
            await db.update(schema.products).set({ salesCount: sql`${schema.products.salesCount} + 1` }).where(eq(schema.products.id, meta.productId));
          }
          return "applied";
        }
        if (meta.kind === "plan" && meta.userId && isPlan(meta.plan)) {
          // Delayed payment methods complete the session before money arrives.
          if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return "ignored";
          await db
            .update(schema.user)
            .set({
              plan: meta.plan,
              stripeCustomerId: typeof s.customer === "string" ? s.customer : undefined,
              stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : undefined,
            })
            .where(eq(schema.user.id, meta.userId));
          return "applied";
        }
        return "ignored";
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const live = event.type !== "customer.subscription.deleted" && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due");
        const plan = isPlan(sub.metadata?.plan) ? sub.metadata.plan : null;
        const end = (sub.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end;
        await db
          .update(schema.user)
          .set(
            live && plan
              ? { plan, stripeSubscriptionId: sub.id, planRenewsAt: end ? new Date(end * 1000) : null }
              : { plan: "free", stripeSubscriptionId: null, planRenewsAt: null },
          )
          .where(eq(schema.user.stripeSubscriptionId, sub.id));
        return "applied";
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        if (!ch.refunded || typeof ch.payment_intent !== "string") return "ignored";
        const sessions = await stripe().checkout.sessions.list({ payment_intent: ch.payment_intent, limit: 1 });
        const sid = sessions.data[0]?.id;
        if (!sid) return "ignored";
        await db.update(schema.orders).set({ status: "refunded" }).where(eq(schema.orders.stripeSessionId, sid));
        return "applied";
      }
      case "charge.dispute.created": {
        // A chargeback: the buyer's bank pulled the money back, so access ends.
        const d = event.data.object as Stripe.Dispute;
        const pi = typeof d.payment_intent === "string" ? d.payment_intent : d.payment_intent?.id;
        if (!pi) return "ignored";
        const sessions = await stripe().checkout.sessions.list({ payment_intent: pi, limit: 1 });
        const sid = sessions.data[0]?.id;
        if (!sid) return "ignored";
        await db.update(schema.orders).set({ status: "disputed" }).where(eq(schema.orders.stripeSessionId, sid));
        return "applied";
      }
      default:
        return "ignored";
    }
  }
}
