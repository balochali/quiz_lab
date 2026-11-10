import { createHmac, timingSafeEqual, scryptSync, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" } as const;

function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set SESSION_SECRET to at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function equal(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  return !!salt && !!hash && equal(scryptSync(password, salt, 64).toString("hex"), hash);
}

export async function login(id: string) {
  const value = id + "." + (Date.now() + 8 * 3600000);
  (await cookies()).set("lecturer", value + "." + sign(value), { ...cookieOptions, maxAge: 28800 });
}

export async function adminId() {
  const raw = (await cookies()).get("lecturer")?.value;
  if (!raw) return null;
  const [id, expiry, signature] = raw.split(".");
  if (!signature || !/^\w+$/.test(id) || Number(expiry) <= Date.now() ||
    !Number.isFinite(Number(expiry)) || !/^[a-f0-9]{64}$/.test(signature) ||
    !equal(sign(id + "." + expiry), signature)) return null;
  const account = await db.admin.findUnique({ where: { id }, select: { verifiedAt: true } });
  return account?.verifiedAt ? id : null;
}

export async function requireAdmin() {
  const id = await adminId();
  if (!id) redirect("/admin/login");
  return id;
}
