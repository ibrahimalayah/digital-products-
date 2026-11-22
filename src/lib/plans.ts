import type { PlanId } from "./types";
import { msg } from "./i18n";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number; // per month
  tagline: string;
  limits: {
    ideasPerMonth: number; // idea-research runs
    productsPerMonth: number; // full product generations
    videosPerMonth: number; // short lead-video scripts
    campaigns: number; // active campaigns
    postsPerDay: number; // per campaign
    monthlyAdBudgetCents: number; // total planned budget across active campaigns
    autopilot: boolean; // daily posting agent
  };
  features: string[];
};

// name, tagline and features are English keys: show them with t(plan.name) etc.
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: msg("Starter"),
    priceCents: 0,
    tagline: msg("Try the studio and finish your first product."),
    limits: {
      ideasPerMonth: 3,
      productsPerMonth: 1,
      videosPerMonth: 2,
      campaigns: 1,
      postsPerDay: 1,
      monthlyAdBudgetCents: 50_00,
      autopilot: false,
    },
    features: [
      msg("3 idea research runs a month"),
      msg("1 full product a month"),
      msg("2 short lead videos a month"),
      msg("1 campaign, up to $50 planned budget"),
      msg("Print-ready PDF export"),
    ],
  },
  pro: {
    id: "pro",
    name: msg("Pro"),
    priceCents: 19_00,
    tagline: msg("For creators shipping a product line."),
    limits: {
      ideasPerMonth: 40,
      productsPerMonth: 15,
      videosPerMonth: 30,
      campaigns: 5,
      postsPerDay: 3,
      monthlyAdBudgetCents: 500_00,
      autopilot: true,
    },
    features: [
      msg("40 idea research runs a month"),
      msg("15 full products a month"),
      msg("30 short lead videos a month"),
      msg("5 campaigns, up to $500 planned budget"),
      msg("Daily autopilot: 3 posts a day per campaign"),
      msg("Auto-publish through Buffer or Postiz"),
    ],
  },
  business: {
    id: "business",
    name: msg("Business"),
    priceCents: 49_00,
    tagline: msg("For studios and agencies running many launches."),
    limits: {
      ideasPerMonth: 200,
      productsPerMonth: 60,
      videosPerMonth: 150,
      campaigns: 25,
      postsPerDay: 10,
      monthlyAdBudgetCents: 5_000_00,
      autopilot: true,
    },
    features: [
      msg("200 idea research runs a month"),
      msg("60 full products a month"),
      msg("150 short lead videos a month"),
      msg("25 campaigns, up to $5,000 planned budget"),
      msg("Daily autopilot: 10 posts a day per campaign"),
      msg("Auto-approve and hands-off publishing"),
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "free"];
}
