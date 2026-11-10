import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { QuizList } from "@/components/quiz-list";

export default async function Quizzes({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const adminId = await requireAdmin();
  const { subject } = await searchParams;
  const selected = typeof subject === "string" ? subject : "";
  const [quizzes, subjects] = await Promise.all([
    db.quiz.findMany({ where: { adminId, ...(selected ? { course: selected } : {}) }, orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true, attempts: true } } } }),
    db.subject.findMany({ where: { adminId }, orderBy: { name: "asc" } }),
  ]);
  return <>
    <header className="row between wrap"><div><p className="eyebrow">Quiz library</p><h1>Quizzes</h1></div>
      <Link className="button primary" href="/admin/quizzes/create"><Plus size={18} /> Create new quiz</Link></header>
    <form className="row wrap">
      <label>Subject<select name="subject" defaultValue={selected}>
        <option value="">All subjects</option>
        {subjects.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
      </select></label>
      <button>Filter</button>
      {selected && <Link href="/admin/quizzes">Clear filter</Link>}
    </form>
    <QuizList quizzes={quizzes} />
  </>;
}
