// Usage: DATABASE_URL=... npm run admin:grant -- you@example.com
import { Pool } from "pg";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email || !process.env.DATABASE_URL) {
    console.error("Usage: DATABASE_URL=... npm run admin:grant -- you@example.com");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const res = await pool.query(`update "user" set role = 'admin' where lower(email) = $1`, [email]);
  await pool.end();
  console.log(res.rowCount ? `Granted admin to ${email}.` : `No account found for ${email}. Sign up first.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
