import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
export default async function ReviewQuiz({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const quiz = await db.quiz.findUnique({ where: { id: (await params).id }, include: {
    admin: { select: { email: true } },
    questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } },
  } });
  if (!quiz) notFound();
  return <><header className="stack"><h2>{quiz.title}</h2><p>{quiz.admin.email} · {quiz.course} · Semester {quiz.semester}</p>
    <p>{quiz.durationMinutes} minutes · {quiz.totalMarks} marks</p><p className="multiline">{quiz.description}</p>
    <p className="multiline">{quiz.instructions}</p><Link href={"/admin/platform/attempts?" + new URLSearchParams({ quiz: quiz.id })}>Review attempts</Link>
  </header>{quiz.questions.map((question, index) => <section className="card stack" key={question.id}>
    <h3>{index + 1}. {question.text}</h3><p>{question.type} · {question.marks} marks</p>
    {question.type === "BLANK" && <p>Accepted answers: {(JSON.parse(question.acceptedAnswers) as string[]).join(" / ")}</p>}
    {question.options.map(option => <p key={option.id} className={option.correct ? "notice" : ""}>{option.correct ? "✓ " : ""}{option.text}</p>)}
  </section>)}</>;
}
