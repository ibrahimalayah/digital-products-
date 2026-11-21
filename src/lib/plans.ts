import type { PlanId } from "./types";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number; // per month
  tagline: string;
  limits: {
    ideasPerMonth: number; // idea-research runs
    productsPerMonth: number; // full product generations
    campaigns: number; // active campaigns
    postsPerDay: number; // per campaign
    monthlyAdBudgetCents: number; // total planned budget across active campaigns
    autopilot: boolean; // daily posting agent
  };
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    priceCents: 0,
    tagline: "Try the studio and finish your first product.",
    limits: {
      ideasPerMonth: 3,
      productsPerMonth: 1,
      campaigns: 1,
      postsPerDay: 1,
      monthlyAdBudgetCents: 50_00,
      autopilot: false,
    },
    features: ["3 idea research runs a month", "1 full product a month", "1 campaign, up to $50 planned budget", "Print-ready PDF export"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 19_00,
    tagline: "For creators shipping a product line.",
    limits: {
      ideasPerMonth: 40,
      productsPerMonth: 15,
      campaigns: 5,
      postsPerDay: 3,
      monthlyAdBudgetCents: 500_00,
      autopilot: true,
    },
    features: ["40 idea research runs a month", "15 full products a month", "5 campaigns, up to $500 planned budget", "Daily autopilot: 3 posts a day per campaign", "Auto-publish through Postiz"],
  },
  business: {
    id: "business",
    name: "Business",
    priceCents: 49_00,
    tagline: "For studios and agencies running many launches.",
    limits: {
      ideasPerMonth: 200,
      productsPerMonth: 60,
      campaigns: 25,
      postsPerDay: 10,
      monthlyAdBudgetCents: 5_000_00,
      autopilot: true,
    },
    features: ["200 idea research runs a month", "60 full products a month", "25 campaigns, up to $5,000 planned budget", "Daily autopilot: 10 posts a day per campaign", "Auto-approve and hands-off publishing"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "free"];
}
