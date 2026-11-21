import fs from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: Db; ready?: Promise<void> };
const g = globalThis as unknown as { __kitforgeDb?: Holder };
const holder: Holder = (g.__kitforgeDb ??= {});

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * Production uses Postgres via DATABASE_URL (Neon). With no DATABASE_URL in
 * development or tests, an embedded Postgres (PGlite) is used so the whole app
 * runs offline. Production refuses to start without a real database.
 */
function init(): Holder {
  if (holder.db) return holder;
  const url = process.env.DATABASE_URL;
  if (url) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
    holder.db = drizzle(pool, { schema }) as unknown as Db;
    holder.ready = Promise.resolve(); // migrations run at build time (scripts/migrate.ts)
    return holder;
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_EMBEDDED_DB !== "1") {
    throw new Error("DATABASE_URL is not set. Add a Postgres database (e.g. `vercel integration add neon`).");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrate } = require("drizzle-orm/pglite/migrator") as typeof import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR;
  const inMemory = dir === "memory" || process.env.NODE_ENV === "test";
  const dataDir = path.resolve(dir ?? ".data/pglite");
  // PGlite creates its own folder but not the parents.
  if (!inMemory) fs.mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = inMemory ? new PGlite() : new PGlite(dataDir);
  const d = drizzle(client, { schema });
  holder.db = d as unknown as Db;
  holder.ready = migrate(d, { migrationsFolder: MIGRATIONS });
  return holder;
}

export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = init().db as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

/** Await before the first query in a request. A no-op once migrations have run. */
export function dbReady(): Promise<void> {
  return init().ready!;
}

export { schema };
