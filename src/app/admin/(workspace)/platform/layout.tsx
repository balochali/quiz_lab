import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return <><header><p className="eyebrow">Platform administration</p><h1>Manage QuizLab</h1></header>
    <nav className="row wrap">
      <Link className="button" href="/admin/platform">Overview</Link>
      <Link className="button" href="/admin/platform/lecturers">Lecturers</Link>
      <Link className="button" href="/admin/platform/students">Students</Link>
      <Link className="button" href="/admin/platform/quizzes">All quizzes</Link>
      <Link className="button" href="/admin/platform/attempts">All attempts</Link>
    </nav>{children}</>;
}
