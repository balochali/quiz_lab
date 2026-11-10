import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || password.length > 256) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12–256 characters) in the environment.");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const passwordHash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
const db = new PrismaClient();
try {
  await db.admin.upsert({ where: { email }, create: { email, passwordHash, verifiedAt: new Date() }, update: { passwordHash, verifiedAt: new Date(), verificationHash: null, verificationExpiresAt: null, verificationSentAt: null } });
  console.log("Lecturer account ready.");
} finally {
  await db.$disconnect();
}
