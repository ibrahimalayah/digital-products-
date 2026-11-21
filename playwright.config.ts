import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    // A production build: what users actually get, and free of dev hot-reload noise.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      PORT: String(PORT),
      // Isolated, throwaway run: in-memory database and deterministic AI fixtures.
      PGLITE_DIR: "memory",
      ALLOW_EMBEDDED_DB: "1",
      E2E: "1",
      BETTER_AUTH_SECRET: "e2e-only-secret-0123456789abcdef0123456789",
      AI_MOCK: "1",
      DATABASE_URL: "",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      ADMIN_BOOTSTRAP_TOKEN: "e2e-owner-token-0123456789abcdef",
      STRIPE_SECRET_KEY: "",
    },
  },
});
