import Link from "next/link";
import { hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { VerifyForm } from "@/components/registration-form";

export const metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const account = typeof token === "string" && /^[a-f0-9]{64}$/.test(token)
    ? await db.admin.findFirst({ where: { verificationHash: hashToken(token), verifiedAt: null, verificationExpiresAt: { gt: new Date() } }, select: { id: true } })
    : null;
  return <main className="narrow card">
    <p className="eyebrow">Lecturer workspace</p><h1>Confirm your email</h1>
    {account && token ? <><p>Choose a password with at least 12 characters.</p><VerifyForm token={token} /></> :
      <p>This confirmation link is invalid, expired, or already used.</p>}
    <Link href="/admin/signup">Request another confirmation email</Link>
  </main>;
}
