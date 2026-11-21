import { NextResponse } from "next/server";
import { dbReady } from "@/db";
import { stripe } from "@/lib/stripe";
import { applyStripeEvent } from "@/server/billing";

// Stripe calls this server to server: no session, no Origin. Trust comes only
// from the signature over the raw body.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  if (!sig) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const raw = await req.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  try {
    await dbReady();
    const result = await applyStripeEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 }); // Stripe retries
  }
}
