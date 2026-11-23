import Link from "next/link";
import { hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { VerifyForm } from "@/components/registration-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const account = typeof token === "string" && /^[a-f0-9]{64}$/.test(token)
    ? await db.admin.findFirst({ where: { verificationHash: hashToken(token), verifiedAt: null, verificationExpiresAt: { gt: new Date() } }, select: { id: true } })
    : null;
  return <AuthShell mode="Account confirmation" title="Confirm your email" description="Choose a secure password to finish setting up your QuizLab teaching workspace.">
    {account && token ? <><p>Choose a password with at least 12 characters.</p><VerifyForm token={token} /></> :
      <p>This confirmation link is invalid, expired, or already used.</p>}
    <p className="auth-switch"><Link href="/admin/signup">Request another confirmation email</Link></p>
  </AuthShell>;
}
