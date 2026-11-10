import Link from "next/link";
import { BarChart3, BookOpen, Plus, Radio } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { QuizList } from "@/components/quiz-list";

export default async function Dashboard() {
  const adminId = await requireAdmin();
  const [total, published, attempts, recent] = await Promise.all([
    db.quiz.count({ where: { adminId } }),
    db.quiz.count({ where: { adminId, published: true } }),
    db.quizAttempt.count({ where: { quiz: { adminId } } }),
    db.quiz.findMany({ where: { adminId }, orderBy: { createdAt: "desc" }, take: 5,
      include: { _count: { select: { questions: true, attempts: true } } } }),
  ]);
  const metrics = [
    { Icon: BookOpen, value: total, label: "Total quizzes" },
    { Icon: Radio, value: published, label: "Published quizzes" },
    { Icon: BarChart3, value: attempts, label: "Student attempts" },
  ];
  return <>
    <section className="hero row between wrap">
      <div><p className="eyebrow">Assessment studio</p><h1>Lecturer overview</h1>
      <p>Build lab quizzes, share them with your class, and track results.</p></div>
      <Link className="button light" href="/admin/quizzes/create"><Plus size={19} /> Create new quiz</Link>
    </section>
    <section className="metrics">
      {metrics.map(({ Icon, value, label }) => (
        <article className="card metric" key={label}><Icon size={22} /><strong>{value}</strong><span>{label}</span></article>
      ))}
    </section>
    <div className="row between"><h2>Recent quizzes</h2><Link href="/admin/quizzes">View all</Link></div>
    <QuizList quizzes={recent} />
  </>;
}

