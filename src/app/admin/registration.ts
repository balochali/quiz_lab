"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, hashToken, login } from "@/lib/auth";
import { verificationMailer } from "@/lib/verification-mail";

const emailSchema = z.email().max(254);
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const passwordSchema = z.string().min(12).max(256);
const confirmationMessage = "If this address can sign up, a confirmation email is on its way. Check your inbox or spam folder.";

export async function requestVerification(_: string, form: FormData) {
  const email = emailSchema.safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return "Enter a valid email address.";
  const send = verificationMailer();
  if (!send) return "Email delivery is not configured. Contact the QuizLab administrator.";
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60000);
  const token = randomBytes(32).toString("hex");
  const verificationHash = hashToken(token);
  const data = { verificationHash, verificationSentAt: now, verificationExpiresAt: new Date(now.getTime() + 3600000) };

  try {
    await db.admin.upsert({ where: { email: email.data }, create: { email: email.data, passwordHash: "" }, update: {} });
    const claimed = await db.admin.updateMany({
      where: { email: email.data, verifiedAt: null, OR: [{ verificationSentAt: null }, { verificationSentAt: { lte: cutoff } }] },
      data,
    });
    if (claimed.count) {
      try {
        await send(email.data, token);
      } catch {
        await db.admin.updateMany({
          where: { verificationHash, verifiedAt: null },
          data: { verificationHash: null, verificationExpiresAt: null, verificationSentAt: null },
        });
        return "The confirmation email could not be sent. Please try again.";
      }
    }
    return confirmationMessage;
  } catch {
    return "Unable to request a confirmation email. Please try again.";
  }
}

export async function confirmRegistration(token: string, _: string, form: FormData) {
  if (!tokenSchema.safeParse(token).success) return "This confirmation link is invalid. Request a new one.";
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return "Choose a password with 12 to 256 characters.";
  if (password.data !== form.get("confirmPassword")) return "The passwords do not match.";

  const verificationHash = hashToken(token);
  const account = await db.admin.findFirst({
    where: { verificationHash, verifiedAt: null, verificationExpiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!account) return "This link has expired or was already used. Request a new email or sign in.";
  const passwordHash = hashPassword(password.data);
  const verifiedAt = new Date();
  const confirmed = await db.admin.updateMany({
    where: { id: account.id, verificationHash, verifiedAt: null, verificationExpiresAt: { gt: verifiedAt } },
    data: { passwordHash, verifiedAt, verificationHash: null, verificationExpiresAt: null, verificationSentAt: null },
  });
  if (!confirmed.count) return "This link has expired or was already used.";
  await login(account.id);
  redirect("/admin/subjects");
}
