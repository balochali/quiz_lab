import { PrismaClient } from "@prisma/client";
import { configureDatabaseEnvironment } from "./database-env.mjs";
import { randomBytes, scryptSync } from "node:crypto";

configureDatabaseEnvironment();
const role = process.env.ADMIN_ROLE ?? "LECTURER";
if (!["LECTURER", "SUPER_ADMIN"].includes(role)) throw new Error("ADMIN_ROLE must be LECTURER or SUPER_ADMIN");
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
  const existing = await db.admin.findUnique({ where: { email }, select: { role: true, verifiedAt: true } });
  if (process.env.ADMIN_BOOTSTRAP === "1" && existing?.role === "SUPER_ADMIN" && existing.verifiedAt) {
    console.log("Platform administrator already provisioned. Existing account preserved.");
  } else {
  await db.admin.upsert({ where: { email }, create: { email, passwordHash, role, verifiedAt: new Date() }, update: { passwordHash, ...(process.env.ADMIN_ROLE ? { role } : {}), suspended: false, verifiedAt: new Date(), verificationHash: null, verificationExpiresAt: null, verificationSentAt: null } });
  console.log("Account ready with requested role.");
  }
} finally {
  await db.$disconnect();
}
