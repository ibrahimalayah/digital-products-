// Sends the site's own emails (password reset links). Three ways, chosen by
// which settings exist:
//  1. Resend (RESEND_API_KEY): needs a domain verified with Resend.
//  2. SMTP (SMTP_USER + SMTP_PASS), Gmail by default: a Gmail address with an
//     app password sends free without a domain (about 500 recipients a day),
//     and mail comes from that address. Same settings as the Rekrutify project.
//  3. Brevo (BREVO_API_KEY + EMAIL_FROM): a sender address verified with Brevo.
import fs from "node:fs";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

export type Email = { to: string; subject: string; text: string; html: string };

type Provider = "resend" | "smtp" | "brevo" | "outbox";

const smtpUser = () => process.env.SMTP_USER?.trim() || "";
// Gmail shows app passwords in groups of four ("abcd efgh ijkl mnop").
const smtpPass = () => (process.env.SMTP_PASS || "").replace(/\s+/g, "");

// Browser tests collect mail in a file instead of sending it. Never on Vercel.
const outboxFile = () => (process.env.EMAIL_OUTBOX_FILE && !process.env.VERCEL ? process.env.EMAIL_OUTBOX_FILE : null);

export function emailProvider(): Provider | null {
  if (outboxFile()) return "outbox";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (smtpUser() && smtpPass()) return "smtp";
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

let transport: { key: string; transporter: Transporter } | null = null;

function smtpTransport(): Transporter {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const key = [host, port, smtpUser(), smtpPass()].join(":");
  if (transport?.key !== key) {
    transport = {
      key,
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: smtpUser(), pass: smtpPass() },
        // A stuck mail server must not hang the request that triggered the email.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      }),
    };
  }
  return transport.transporter;
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

  if (provider === "smtp") {
    try {
      // Gmail rewrites any other From address to the signed-in account, so send as that account.
      await smtpTransport().sendMail({ from: { name: from.name, address: smtpUser() }, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    } catch (err) {
      const e = err as { code?: string; responseCode?: number };
      const rejected = e.code === "EAUTH" || e.responseCode === 535;
      throw new Error(rejected ? "SMTP sign-in rejected (check SMTP_USER and SMTP_PASS)." : "SMTP error (" + (e.code ?? e.responseCode ?? "unknown") + ").");
    }
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
