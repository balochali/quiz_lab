import Link from "next/link";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { statusLabel } from "@/lib/quiz-schema";
import { settleExpired } from "@/lib/attempt";
export default async function AllAttempts({ searchParams }: { searchParams: Promise<{ student?: string; quiz?: string; page?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const student = typeof query.student === "string" ? query.student : "";
  const quiz = typeof query.quiz === "string" ? query.quiz : "";
  const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
  await settleExpired();
  const attempts = await db.quizAttempt.findMany({ where: { ...(student ? { studentId: student } : {}), ...(quiz ? { quizId: quiz } : {}) },
    select: { id: true, studentName: true, rollNumber: true, quizTitle: true, obtainedMarks: true, totalMarks: true,
      status: true, submittedAt: true, gradingPending: true, quiz: { select: { admin: { select: { email: true } } } }, _count: { select: { violations: true } } },
    orderBy: { startedAt: "desc" }, skip: (page - 1) * 50, take: 51 });
  const params = new URLSearchParams({ student, quiz });
  return <><section className="card scroll"><table>
    <thead><tr><th>Student</th><th>Roll number</th><th>Quiz / Lecturer</th><th>Marks</th><th>Status</th><th>Events</th></tr></thead>
    <tbody>{attempts.slice(0, 50).map(a => <tr key={a.id}><td><Link href={"/admin/platform/attempts/" + a.id}>{a.studentName}</Link></td><td>{a.rollNumber}</td>
      <td>{a.quizTitle}<br />{a.quiz.admin.email}</td><td>{a.gradingPending ? "Awaiting grading" : a.submittedAt ? a.obtainedMarks + " / " + a.totalMarks : "—"}</td>
      <td>{statusLabel(a.status)}</td><td>{a._count.violations}</td></tr>)}</tbody></table>{!attempts.length && <p>No attempts found.</p>}
    </section><nav className="row">
      {page > 1 && <Link href={"?" + params + "&page=" + (page - 1)}>Previous</Link>}
      {attempts.length > 50 && <Link href={"?" + params + "&page=" + (page + 1)}>Next</Link>}
    </nav></>;
}
