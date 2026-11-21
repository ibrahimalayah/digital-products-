import Stripe from "stripe";
import { notConfigured } from "./errors";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw notConfigured("Payments are not connected yet. Add Stripe to finish setup.");
  return (client ??= new Stripe(key));
}
