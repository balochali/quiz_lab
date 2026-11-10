import nodemailer from "nodemailer";

export function verificationMailer() {
  const { SMTP_URL, SMTP_FROM, APP_URL } = process.env;
  if (!SMTP_URL || !SMTP_FROM || !APP_URL) return null;
  try {
    const base = new URL(APP_URL);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if (base.protocol !== "https:" && !(local && base.protocol === "http:")) return null;
    const smtp = new URL(SMTP_URL);
    if (smtp.protocol !== "smtp:" && smtp.protocol !== "smtps:") return null;
    const localSmtp = ["localhost", "127.0.0.1", "[::1]"].includes(smtp.hostname);
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
    return null;
  }
}
