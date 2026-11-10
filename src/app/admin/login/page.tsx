import Link from "next/link";
import { redirect } from "next/navigation";
import { adminId } from "@/lib/auth";
import { LoginForm } from "@/components/login";

export default async function Login() {
  if (await adminId()) redirect("/admin/dashboard");
  return <main className="narrow card"><p className="eyebrow">Lecturer workspace</p>
    <h1>Welcome back</h1><p>Sign in to manage assessments and results.</p><LoginForm />
    <Link href="/admin/signup">New lecturer? Create an account</Link>
  </main>;
}
