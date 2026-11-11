import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { subjectStyle } from "@/lib/subject-style";
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
    <header className="row between wrap">
      <div><p className="eyebrow">Your teaching collection</p><h1>My subjects</h1><p className="muted">A space for every subject. A new challenge for every class.</p></div>
      <div className="row wrap"><span className="subject-total"><Layers3 size={18} /> {subjects.length} {subjects.length === 1 ? "subject" : "subjects"}</span>
        <SubjectForm key={subjects.length} /></div>
    </header>
    {added === "1" && <p role="status" className="notice">Subject saved. Your collection is ready below.</p>}

    <section className="stack" aria-labelledby="subject-collection-title">
      <div className="row between wrap"><h2 id="subject-collection-title">Your collection</h2><span className="muted subject-hint">Choose a subject to explore its quizzes</span></div>
      {subjects.length === 0 ? <div className="card subject-empty">
        <span className="subject-empty-icon"><BookOpen size={32} /></span>
        <h3>Your next great quiz starts here</h3><p>Select “Add a subject” above to begin your collection.</p>
      </div> :
        <div className="subject-grid">{subjects.map(subject => {
          const { Icon, theme, label } = subjectStyle(subject.name);
          const count = counts.get(subject.name) ?? 0;
          return <Link className={"subject-card subject-" + theme} key={subject.id}
            href={"/admin/quizzes?" + new URLSearchParams({ subject: subject.name })}>
            <div className="subject-cover">
              <span className="subject-icon"><Icon size={34} strokeWidth={1.7} /></span>
              <span className="subject-cover-label"><Sparkles size={12} /> Your classroom</span>
              <span className="subject-pattern" aria-hidden="true"><Icon size={130} strokeWidth={.8} /></span>
            </div>
            <div className="subject-card-body">
              <p className="subject-kicker">{label}</p><h3>{subject.name}</h3>
              <div className="subject-card-footer">
                <span className="subject-quiz-count"><BookOpen size={15} /> {count} {count === 1 ? "quiz" : "quizzes"}</span>
                <span className="subject-card-action">View quizzes <span><ArrowUpRight size={18} /></span></span>
              </div>
            </div>
          </Link>;
        })}</div>}
    </section>
  </>;
}
