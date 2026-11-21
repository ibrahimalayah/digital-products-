# Kitforge

An AI studio for digital products, with a public store and a creator SaaS in one app.

1. **Idea lab** – give the idea scout a niche; it proposes specific printable products (promise, buyer, contents, suggested price).
2. **Product studio** – the product writer plans an outline and writes every page (steps, checklists, templates, fill-ins, tips). Export a print-ready PDF in US Letter or A4.
3. **Campaigns** – set a monthly budget, pick channels, and the ad planner splits the budget and chooses angles. The daily poster writes posts; the publisher schedules them through [Buffer](https://buffer.com) (free for up to 3 channels) or [Postiz](https://postiz.com).
4. **Autopilot** – a daily cron writes and (optionally) publishes posts for every active campaign.
5. **Store** – the platform owner publishes products; buyers pay with Stripe Checkout and download from their library.
6. **Plans** – Starter (free), Pro and Business subscriptions gate quotas, campaign budgets and autopilot.
7. **Control panel** (`/admin`) – revenue, users, orders, products, integration status, manual autopilot run.

## Publishing

Each creator connects their own publishing service under Settings → Publishing:

- **Buffer** (default, free plan works): create a key at `publish.buffer.com/settings/api`. Text posts go to X, LinkedIn, Facebook, Threads, Bluesky, Mastodon and Google Business. Networks that need an image or extra details (Instagram, TikTok, Pinterest, YouTube) are not offered.
- **Postiz**: paste the public API key from Settings → Developers.

Keys are encrypted per user. Without a service, posts can be copied by hand.

## Starter product

The control panel has an "Add the starter product" button. It puts a finished, hand-edited 10-page planner ("Money Reset 2027: The 30-Day Budget Planner") on the owner's shelf, ready to price and publish. It needs no AI.

## AI providers

The agents use a free-tier chain ported from the Rekrutify project, tried in order with automatic failover: FreeLLMAPI (local only), Groq (`GROQ_API_KEY`), Google Gemini (`GEMINI_API_KEY`), OpenRouter (`OPENROUTER_API_KEY`), then OpenAI. If none is set or all fail, Anthropic (`ANTHROPIC_API_KEY`) or Vercel AI Gateway is used; the gateway needs a card on the Vercel account. `/admin/system` shows the active order.

## Local demo

`npm run demo:live` does the same with real AI (it reads the AI keys in `.env.local`). `npm run demo` runs a production build on http://localhost:3000 with a throwaway local database and sample AI content. In a second terminal, `node scripts/demo-setup.mjs` creates an owner account, adds the starter product and publishes it; the sign-in details are written to `.demo-credentials.local`.

## Brand photos

The landing page, sign-in screens and store header use photos from `public/brand/` when they exist (`hero.jpg`, `auth.jpg`, `store.jpg`) and drawn artwork when they do not. See `public/brand/README.md`.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Drizzle ORM on Postgres · Better Auth · Stripe · Vercel AI SDK via AI Gateway · `@react-pdf/renderer` · Vitest + Playwright.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

With no `DATABASE_URL`, development uses an embedded Postgres stored in `.data/`, so nothing else is needed to explore the app. AI features need AI Gateway credentials (`vercel env pull`, or `AI_GATEWAY_API_KEY` in `.env.local`). See `.env.example` for every variable.

## Tests

```bash
npm test             # 88 unit and integration tests against an in-memory Postgres
npm run test:e2e     # 6 browser journeys against a production build
npm run typecheck && npm run lint
```

Tests use deterministic AI fixtures (`AI_MOCK=1`), which are disabled on Vercel.

## Deploy to Vercel

```bash
vercel link
vercel integration add neon      # Postgres → DATABASE_URL
vercel integration add stripe    # payments → STRIPE_SECRET_KEY
```

Then set these environment variables (Production and Preview):

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Session signing. `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Required to store creators' Postiz keys. `openssl rand -base64 32` |
| `CRON_SECRET` | Protects `/api/cron/daily` |
| `ADMIN_BOOTSTRAP_TOKEN` | One-time owner claim at `/claim` |
| `NEXT_PUBLIC_APP_URL` | Public URL, used in checkout redirects and post links |
| `STRIPE_WEBHOOK_SECRET` | From a Stripe webhook pointing at `/api/stripe/webhook` |

Stripe webhook events to enable: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`.

Migrations in `drizzle/` are applied automatically during `npm run build` when `DATABASE_URL` is set.

### Become the owner

Sign up, open `/claim`, and paste `ADMIN_BOOTSTRAP_TOKEN`. The claim works once; afterwards remove the variable and grant further admins from the control panel. Alternatively: `DATABASE_URL=... npm run admin:grant -- you@example.com`.

## How budgets work

Budgets are planning limits. Kitforge writes and schedules organic posts and tells you how to split a paid budget across channels; the paid spend itself is set up in each network's ads manager and billed by that network.

## Project layout

```
src/app            routes: (site) marketing + store, (auth), app (studio), admin, api
src/server         business logic: ideas, products, campaigns, autopilot, billing, admin
src/lib            auth, AI, Stripe, Postiz, PDF, quotas, rate limiting, crypto
src/db             Drizzle schema and client
drizzle            SQL migrations
tests, e2e         Vitest and Playwright suites
```

## Security notes

- Every API route requires a session except auth, the Stripe webhook (signature-verified), cron (secret-verified) and health.
- All data access is scoped by owner; other users' ids return 404.
- Writes are same-origin only; inputs are validated with Zod; rate limits and plan quotas are enforced in Postgres.
- Role and plan can never be set from the client. Third-party API keys are encrypted with AES-256-GCM.
- AI use is bounded three ways: monthly plan quotas, one write per section per outline, and a per-account daily ceiling.
- Sign-in and sign-up are rate limited in Postgres per IP and per email.
- Prices are read from the database at checkout; orders are created only from verified Stripe events.
