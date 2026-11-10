import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { SubjectForm } from "@/components/subject-form";

export default async function Subjects({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const adminId = await requireAdmin();
  const [{ added }, subjects, quizCounts] = await Promise.all([
    searchParams,
    db.subject.findMany({ where: { adminId }, orderBy: { name: "asc" } }),
    db.quiz.groupBy({ by: ["course"], where: { adminId }, _count: { _all: true } }),
  ]);
  const counts = new Map(quizCounts.map(row => [row.course, row._count._all]));
  return <>
    <header><p className="eyebrow">Lecturer workspace</p><h1>Subjects</h1><p>Organize your quizzes by the subjects you teach.</p></header>
    <section className="card stack">
      <h2>Add a subject</h2>
      <SubjectForm />
      {added === "1" && <p role="status" className="notice">Subject saved.</p>}
    </section>
    <section className="card stack">
      <h2>Your subjects</h2>
      {subjects.length === 0 ? <p>Add your first subject to start creating quizzes.</p> :
        subjects.map(subject => <div className="row between wrap" key={subject.id}>
          <strong>{subject.name}</strong>
          <Link href={"/admin/quizzes?" + new URLSearchParams({ subject: subject.name })}>View quizzes ({counts.get(subject.name) ?? 0})</Link>
        </div>)}
    </section>
  </>;
}
