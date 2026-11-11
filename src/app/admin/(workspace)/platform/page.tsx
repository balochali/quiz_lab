import Link from "next/link";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
export default async function PlatformOverview() {
  await requireSuperAdmin();
  const [lecturers, students, quizzes, attempts, subjects] = await Promise.all([
    db.admin.count({ where: { role: "LECTURER" } }), db.student.count(), db.quiz.count(), db.quizAttempt.count(), db.subject.count(),
  ]);
  return <><section className="metrics">
    {[["Lecturers", lecturers, "/admin/platform/lecturers"], ["Students", students, "/admin/platform/students"],
      ["Quizzes", quizzes, "/admin/platform/quizzes"], ["Attempts", attempts, "/admin/platform/attempts"]].map(([label, count, href]) =>
      <Link className="card metric" key={label} href={String(href)}><strong>{count}</strong><span>{label}</span></Link>)}
  </section><section className="card"><h2>{subjects} subjects across the platform</h2><p>Manage lecturer access and review quizzes and student submissions.</p></section></>;
}
