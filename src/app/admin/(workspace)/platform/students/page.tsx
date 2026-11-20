import { finalMarks } from "@/lib/score-adjustments";
import { AdminUserCard } from "@/components/admin-user-card";
import Link from "next/link";
import { db } from "@/lib/db";
import { statusLabel } from "@/lib/quiz-schema";
import { requireSuperAdmin } from "@/lib/auth";
export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; type?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 150) : "";
  const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
  const students = await db.student.findMany({
    where: { OR: [{ name: { contains: q } }, { rollNumber: { contains: q.toUpperCase() } }] },
    select: { id: true, name: true, rollNumber: true, semester: true, attempts: { take: 3, orderBy: { startedAt: "desc" }, select: { id: true, quizTitle: true, status: true, obtainedMarks: true, adjustedMarks: true, totalMarks: true, submittedAt: true, gradingPending: true } }, _count: { select: { attempts: true } } },
    orderBy: { rollNumber: "asc" }, skip: (page - 1) * 50, take: 51,
  });
  return <><header className="admin-page-heading"><p className="eyebrow">Your learning community</p><h1>Students</h1><p>Find student profiles and explore assessment records.</p></header><form className="row wrap">{query.type && <input type="hidden" name="type" value={query.type} />}<label>Student name or roll number<input name="q" defaultValue={q} /></label><button>Search</button></form>
    <div className="admin-user-grid">{students.slice(0, 50).map((student, index) => <AdminUserCard key={student.id} title={student.name} subtitle="Student" status={student.rollNumber} metrics={["Semester " + student.semester, student._count.attempts + " attempts"]} tone={index + 1}>
      <dl className="admin-profile-facts"><div><dt>Roll number</dt><dd>{student.rollNumber}</dd></div><div><dt>Semester</dt><dd>{student.semester}</dd></div><div><dt>Quiz attempts</dt><dd>{student._count.attempts}</dd></div></dl>
      <h3>Recent assessment activity</h3>{student.attempts.length ? student.attempts.map(attempt => <Link className="admin-recent-attempt" key={attempt.id} href={"/admin/platform/attempts/" + attempt.id}><strong>{attempt.quizTitle}</strong><span>{statusLabel(attempt.status)} · {attempt.gradingPending ? "Awaiting grading" : attempt.submittedAt ? `${finalMarks(attempt)} / ${attempt.totalMarks} marks` : "In progress"}</span></Link>) : <p>No quiz attempts yet.</p>}
      <Link className="button primary" href={"/admin/platform/attempts?" + new URLSearchParams({ student: student.id })}>View all attempts</Link>
    </AdminUserCard>)}</div>{!students.length && <p className="card empty">No matching students.</p>}
    <nav className="row">
      {page > 1 && <Link href={"?" + new URLSearchParams({ q, ...(query.type ? { type: query.type } : {}), page: String(page - 1) })}>Previous</Link>}
      {students.length > 50 && <Link href={"?" + new URLSearchParams({ q, ...(query.type ? { type: query.type } : {}), page: String(page + 1) })}>Next</Link>}
    </nav></>;
}
