import Link from "next/link";
import { redirect } from "next/navigation";
import { adminId } from "@/lib/auth";
import { LoginForm } from "@/components/login";
import { AuthShell } from "@/components/auth-shell";

export default async function Login() {
  if (await adminId()) redirect("/admin/dashboard");
  return <AuthShell mode="Lecturer sign in" title="Welcome back" description="Sign in to your QuizLab workspace to manage assessments, students, and results.">
    <LoginForm />
    <p className="auth-switch">New to QuizLab? <Link href="/admin/signup">Create your lecturer account</Link></p>
  </AuthShell>;
}
