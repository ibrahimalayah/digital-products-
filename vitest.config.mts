import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      AI_MOCK: "1",
      PGLITE_DIR: "memory",
      DATABASE_URL: "", // never the real database, whatever the shell or .env.local contains
      STRIPE_SECRET_KEY: "sk_test_unit_only",
      STRIPE_WEBHOOK_SECRET: "whsec_unit_only_secret",
      CRON_SECRET: "cron-secret-for-tests-0123456789",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
    // One in-memory database per test file.
    pool: "forks",
  },
});
