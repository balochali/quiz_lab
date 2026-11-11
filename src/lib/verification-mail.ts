import nodemailer from "nodemailer";

export function verificationMailer() {
  const { SMTP_URL, SMTP_FROM, APP_URL } = process.env;
  const missing = Object.entries({ SMTP_URL, SMTP_FROM, APP_URL })
    .filter(([, value]) => !value?.trim()).map(([name]) => name);
  if (missing.length) {
    console.error("Email configuration invalid: missing variables", missing.join(", "));
    return null;
  }
  if (!SMTP_URL || !SMTP_FROM || !APP_URL) return null;
  let setting = "APP_URL";
  try {
    const base = new URL(APP_URL);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if (base.protocol !== "https:" && !(local && base.protocol === "http:")) {
      console.error("Email configuration invalid: APP_URL requires HTTPS (HTTP allowed on localhost only)");
      return null;
    }
    setting = "SMTP_URL";
    const smtp = new URL(SMTP_URL);
    if (smtp.protocol !== "smtp:" && smtp.protocol !== "smtps:") {
      console.error("Email configuration invalid: SMTP_URL must start with smtp:// or smtps://");
      return null;
    }
    const localSmtp = ["localhost", "127.0.0.1", "[::1]"].includes(smtp.hostname);
    setting = "SMTP transport";
    const transport = nodemailer.createTransport({
      url: SMTP_URL, requireTLS: smtp.protocol === "smtp:" && !localSmtp,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    return async (email: string, token: string) => {
      const url = new URL("/admin/verify", base);
      url.searchParams.set("token", token);
      await transport.sendMail({
        from: SMTP_FROM, to: email, subject: "Confirm your QuizLab lecturer account",
        text: "Open this link within one hour to confirm your email and choose a password:\n\n" +
          url.href + "\n\nIf you did not request a QuizLab account, you can ignore this message.",
      });
    };
  } catch {
    // Never log URL parser exceptions, which can contain the SMTP credentials.
    console.error("Email configuration invalid: check", setting, "for surrounding quotes, a copied variable name, or malformed URL syntax");
    return null;
  }
}
