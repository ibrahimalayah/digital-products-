// Sends the site's own emails (password reset links). Works with Resend or
// Brevo, both of which have a free plan; set one key and EMAIL_FROM.
import fs from "node:fs";
import path from "node:path";

export type Email = { to: string; subject: string; text: string; html: string };

type Provider = "resend" | "brevo" | "outbox";

// Browser tests collect mail in a file instead of sending it. Never on Vercel.
const outboxFile = () => (process.env.EMAIL_OUTBOX_FILE && !process.env.VERCEL ? process.env.EMAIL_OUTBOX_FILE : null);

export function emailProvider(): Provider | null {
  if (outboxFile()) return "outbox";
  if (process.env.RESEND_API_KEY) return "resend";
  // Brevo only sends from an address you have verified with them.
  if (process.env.BREVO_API_KEY && process.env.EMAIL_FROM) return "brevo";
  return null;
}

export const emailReady = () => emailProvider() !== null;

/** "Kitforge <hello@example.com>" or a bare address. */
function sender() {
  const raw = process.env.EMAIL_FROM?.trim() || "Kitforge <onboarding@resend.dev>";
  const m = raw.match(/^(.*)<([^>]+)>$/);
  return m ? { name: m[1].trim() || "Kitforge", email: m[2].trim() } : { name: "Kitforge", email: raw };
}

export async function sendEmail(mail: Email): Promise<void> {
  const provider = emailProvider();
  if (!provider) throw new Error("No email service is configured.");
  const from = sender();

  if (provider === "outbox") {
    const file = outboxFile()!;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(mail) + "\n");
    return;
  }

  const res =
    provider === "resend"
      ? await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
          signal: AbortSignal.timeout(15_000),
        })
      : await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ sender: from, to: [{ email: mail.to }], subject: mail.subject, textContent: mail.text, htmlContent: mail.html }),
          signal: AbortSignal.timeout(15_000),
        });
  if (!res.ok) throw new Error(`Email service answered ${res.status}.`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A plain message with one button, as text and as simple HTML. */
export function linkEmail(p: { greeting: string; intro: string; button: string; url: string; outro: string; rtl?: boolean }) {
  const text = `${p.greeting}\n\n${p.intro}\n${p.url}\n\n${p.outro}\n\nKitforge`;
  const html = `<div dir="${p.rtl ? "rtl" : "ltr"}" style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1c1a17;max-width:520px;margin:0 auto;padding:24px">
<p>${esc(p.greeting)}</p>
<p>${esc(p.intro)}</p>
<p style="margin:28px 0"><a href="${esc(p.url)}" style="background:#1c1a17;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">${esc(p.button)}</a></p>
<p style="font-size:13px;color:#6b665e;word-break:break-all">${esc(p.url)}</p>
<p style="font-size:14px;color:#6b665e">${esc(p.outro)}</p>
<p style="font-size:14px;color:#6b665e">Kitforge</p>
</div>`;
  return { text, html };
}
