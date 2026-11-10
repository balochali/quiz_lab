import Link from "next/link";
import { redirect } from "next/navigation";
import { adminId } from "@/lib/auth";
import { SignupForm } from "@/components/registration-form";

export default async function Signup() {
  if (await adminId()) redirect("/admin/dashboard");
  return <main className="narrow card">
    <p className="eyebrow">Lecturer workspace</p><h1>Create an account</h1>
    <p>Enter your email. We’ll send you a link to confirm it and choose a password.</p>
    <SignupForm />
    <Link href="/admin/login">Already have an account? Sign in</Link>
  </main>;
}
