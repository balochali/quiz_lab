import Link from "next/link";
import { redirect } from "next/navigation";
import { adminId } from "@/lib/auth";
import { SignupForm } from "@/components/registration-form";
import { AuthShell } from "@/components/auth-shell";

export default async function Signup() {
  if (await adminId()) redirect("/admin/dashboard");
  return <AuthShell mode="Create lecturer account" title="Start with QuizLab" description="Use your teaching email. We’ll send a confirmation link so you can choose a secure password.">
    <SignupForm />
    <p className="auth-switch">Already have a QuizLab account? <Link href="/admin/login">Sign in</Link></p>
  </AuthShell>;
}
