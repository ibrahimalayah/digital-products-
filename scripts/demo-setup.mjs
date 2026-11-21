// Prepares the local demo (npm run demo): creates an owner account, adds the
// starter product and publishes it. Localhost only. Credentials are written to
// .demo-credentials.local, which is git-ignored.
import fs from "node:fs";
import { randomBytes } from "node:crypto";

const base = "http://localhost:3000";
const file = ".demo-credentials.local";
const token = process.env.ADMIN_BOOTSTRAP_TOKEN || "local-demo-owner-token-0000";
let creds = fs.existsSync(file) ? Object.fromEntries(fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2))) : null;
let cookie = "";

async function call(path, body, method = "POST") {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", origin: base, cookie }, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

if (!creds) {
  creds = { EMAIL: "owner@kitforge.test", PASSWORD: randomBytes(12).toString("base64url") };
  const r = await call("/api/auth/sign-up/email", { name: "Demo Owner", email: creds.EMAIL, password: creds.PASSWORD });
  if (r.status !== 200) throw new Error("sign-up failed: " + JSON.stringify(r.json));
  fs.writeFileSync(file, `EMAIL=${creds.EMAIL}\nPASSWORD=${creds.PASSWORD}\n`, { mode: 0o600 });
  console.log("created owner account");
} else {
  const r = await call("/api/auth/sign-in/email", { email: creds.EMAIL, password: creds.PASSWORD });
  if (r.status !== 200) throw new Error("sign-in failed; remove .data and " + file + " to start over");
  console.log("signed in as existing owner");
}
console.log("claim:", (await call("/api/admin/claim", { token })).status);
const add = await call("/api/admin/starter", {});
console.log("starter:", add.status, add.json.error?.message ?? "added");
if (add.json.product) {
  const id = add.json.product.id;
  console.log("publish:", (await call(`/api/products/${id}`, { published: true }, "PATCH")).status);
  const pdf = await fetch(`${base}/api/products/${id}/pdf`, { headers: { cookie } });
  const out = process.argv[2];
  if (out) fs.writeFileSync(out, Buffer.from(await pdf.arrayBuffer()));
  console.log("pdf:", pdf.status, pdf.headers.get("content-type"));
}
console.log(`\nSign in at ${base}/sign-in with the details in ${file}`);
