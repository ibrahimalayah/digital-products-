import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { ProductOutline, ProductSection, BudgetPlan, CampaignChannel } from "@/lib/types";

/* ───────────── Auth (Better Auth) ───────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  // Platform fields. Never writable from the client (input: false in auth config).
  role: text("role").default("user").notNull(), // "user" | "admin"
  plan: text("plan").default("free").notNull(), // "free" | "pro" | "business"
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  planRenewsAt: timestamp("plan_renews_at"),
  suspended: boolean("suspended").default(false).notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ───────────── Workspace ───────────── */

export const settings = pgTable("settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  brandName: text("brand_name").default("").notNull(),
  brandVoice: text("brand_voice").default("").notNull(),
  // AES-256-GCM ciphertext of the creator's Postiz API key. Never returned to the client.
  postizKeyEnc: text("postiz_key_enc"),
  autopilot: boolean("autopilot").default(false).notNull(),
  autoApprove: boolean("auto_approve").default(false).notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const ideas = pgTable(
  "ideas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    niche: text("niche").notNull(),
    title: text("title").notNull(),
    promise: text("promise").notNull(),
    audience: text("audience").notNull(),
    format: text("format").notNull(),
    proof: text("proof").notNull(),
    suggestedPriceCents: integer("suggested_price_cents").default(900).notNull(),
    saved: boolean("saved").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("ideas_user_idx").on(t.userId, t.createdAt)],
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ideaId: text("idea_id"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    promise: text("promise").notNull(),
    audience: text("audience").notNull(),
    format: text("format").notNull(),
    tone: text("tone").default("warm, friendly and easy to read").notNull(),
    pageSize: text("page_size").default("LETTER").notNull(), // "LETTER" | "A4"
    accent: text("accent").default("#1f6f5c").notNull(),
    priceCents: integer("price_cents").default(900).notNull(),
    // draft → outlined → generating → ready → published
    status: text("status").default("draft").notNull(),
    outline: jsonb("outline").$type<ProductOutline>(),
    sections: jsonb("sections").$type<ProductSection[]>().default([]).notNull(),
    salesCount: integer("sales_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_user_idx").on(t.userId, t.createdAt),
    index("products_status_idx").on(t.status),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("usd").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    status: text("status").default("paid").notNull(), // "paid" | "refunded"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("orders_session_idx").on(t.stripeSessionId),
    index("orders_user_idx").on(t.userId),
    index("orders_product_idx").on(t.productId),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    objective: text("objective").default("sales").notNull(), // "sales" | "awareness" | "leads"
    monthlyBudgetCents: integer("monthly_budget_cents").default(0).notNull(),
    postsPerDay: integer("posts_per_day").default(1).notNull(),
    channels: jsonb("channels").$type<CampaignChannel[]>().default([]).notNull(),
    plan: jsonb("plan").$type<BudgetPlan>(),
    status: text("status").default("draft").notNull(), // "draft" | "active" | "paused"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("campaigns_user_idx").on(t.userId), index("campaigns_status_idx").on(t.status)],
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // provider identifier, e.g. "x", "linkedin"
    integrationId: text("integration_id"),
    angle: text("angle").default("").notNull(),
    content: text("content").notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    // draft → approved → scheduled (sent to Postiz) | failed
    status: text("status").default("draft").notNull(),
    externalId: text("external_id"),
    error: text("error"),
    sendingAt: timestamp("sending_at"), // when a publish attempt claimed the post
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("posts_campaign_idx").on(t.campaignId, t.scheduledAt),
    index("posts_user_status_idx").on(t.userId, t.status),
  ],
);

export const usage = pgTable(
  "usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // "2026-11"
    key: text("key").notNull(), // "ideas" | "products" | "posts"
    count: integer("count").default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.period, t.key] })],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agent: text("agent").notNull(), // "idea-scout" | "product-writer" | "ad-planner" | "daily-poster" | "publisher"
    status: text("status").notNull(), // "ok" | "error" | "skipped"
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("agent_runs_user_idx").on(t.userId, t.createdAt)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

// Processed Stripe event ids, so webhook retries are idempotent.
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
