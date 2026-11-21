// Applies SQL migrations to the production database during `npm run build`.
// Skips quietly when DATABASE_URL is absent (local builds use embedded Postgres).
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  // Schema changes go over the direct connection when one is provided (Neon), not the pooler.
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.log("[migrate] DATABASE_URL not set, skipping.");
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("[migrate] migrations applied.");
}

main().catch((e) => {
  console.error("[migrate] failed:", e);
  process.exit(1);
});
