import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { emailProvider, linkEmail, sendEmail } from "@/lib/email";

const KEYS = ["RESEND_API_KEY", "SMTP_USER", "SMTP_PASS", "SMTP_HOST", "SMTP_PORT", "BREVO_API_KEY", "EMAIL_FROM", "EMAIL_OUTBOX_FILE"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function setEnv(values: Record<string, string>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, values);
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** A mail server just real enough for one message: greets, accepts a login, records what it was sent. */
function fakeSmtp(acceptLogin = true) {
  const seen = { auth: "", from: "", to: "", data: "" };
  const server = net.createServer((socket) => {
    let inData = false;
    let buffer = "";
    socket.write("220 fake ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (inData) {
        if (!buffer.includes("\r\n.\r\n")) return;
        seen.data = buffer;
        buffer = "";
        inData = false;
        socket.write("250 queued\r\n");
        return;
      }
      let at: number;
      while ((at = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, at);
        buffer = buffer.slice(at + 2);
        const cmd = line.toUpperCase();
        if (cmd.startsWith("EHLO")) socket.write("250-fake\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (cmd.startsWith("AUTH PLAIN")) {
          seen.auth = Buffer.from(line.split(" ")[2] ?? "", "base64").toString("utf8");
          socket.write(acceptLogin ? "235 ok\r\n" : "535 bad credentials\r\n");
        } else if (cmd.startsWith("MAIL FROM")) {
          seen.from = line;
          socket.write("250 ok\r\n");
        } else if (cmd.startsWith("RCPT TO")) {
          seen.to = line;
          socket.write("250 ok\r\n");
        } else if (cmd === "DATA") {
          inData = true;
          socket.write("354 go\r\n");
        } else if (cmd === "QUIT") {
          socket.write("221 bye\r\n");
          socket.end();
        } else socket.write("250 ok\r\n");
      }
    });
    socket.on("error", () => undefined);
  });
  return new Promise<{ port: number; seen: typeof seen; close: () => void }>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as net.AddressInfo).port, seen, close: () => server.close() }));
  });
}

describe("email", () => {
  it("picks the provider from the settings that exist", () => {
    setEnv({});
    expect(emailProvider()).toBeNull();
    setEnv({ SMTP_USER: "me@example.test" });
    expect(emailProvider()).toBeNull(); // a user without a password is not enough
    setEnv({ SMTP_USER: "me@example.test", SMTP_PASS: "abcd efgh ijkl mnop" });
    expect(emailProvider()).toBe("smtp");
    setEnv({ BREVO_API_KEY: "k" });
    expect(emailProvider()).toBeNull(); // Brevo needs a verified sender
    setEnv({ BREVO_API_KEY: "k", EMAIL_FROM: "Kitforge <hi@example.test>" });
    expect(emailProvider()).toBe("brevo");
    setEnv({ RESEND_API_KEY: "k", SMTP_USER: "me@example.test", SMTP_PASS: "x" });
    expect(emailProvider()).toBe("resend");
  });

  it("sends through SMTP as the signed-in account, with the app password's spaces removed", async () => {
    const smtp = await fakeSmtp();
    setEnv({ SMTP_USER: "sender@example.test", SMTP_PASS: "abcd efgh ijkl mnop", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.port), EMAIL_FROM: "Kitforge <other@example.test>" });
    const { text, html } = linkEmail({ greeting: "Hi Ada,", intro: "Use this link:", button: "Choose a new password", url: "https://example.test/reset?token=abc", outro: "Ignore this if it was not you." });
    await sendEmail({ to: "ada@example.test", subject: "Reset your Kitforge password", text, html });
    smtp.close();
    expect(smtp.seen.auth).toBe("\u0000sender@example.test\u0000abcdefghijklmnop");
    expect(smtp.seen.from).toContain("<sender@example.test>");
    expect(smtp.seen.to).toContain("<ada@example.test>");
    expect(smtp.seen.data).toContain("Subject: Reset your Kitforge password");
    expect(smtp.seen.data).toContain("From: Kitforge <sender@example.test>");
    expect(smtp.seen.data.replace(/=\r\n/g, "")).toContain("https://example.test/reset?token=3Dabc");
  });

  it("reports a rejected sign-in without leaking the password", async () => {
    const smtp = await fakeSmtp(false);
    setEnv({ SMTP_USER: "sender@example.test", SMTP_PASS: "wrong-secret", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.port) });
    const err = await sendEmail({ to: "ada@example.test", subject: "s", text: "t", html: "<p>t</p>" }).catch((e: Error) => e);
    smtp.close();
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("SMTP sign-in rejected (check SMTP_USER and SMTP_PASS).");
  });

  it("escapes text in the HTML version and marks right-to-left mail", () => {
    const { html } = linkEmail({ greeting: "Hi <b>x</b>,", intro: "i", button: "b", url: "https://example.test/?a=1&b=2", outro: "o", rtl: true });
    expect(html).toContain("Hi &lt;b&gt;x&lt;/b&gt;,");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("a=1&amp;b=2");
  });
});
