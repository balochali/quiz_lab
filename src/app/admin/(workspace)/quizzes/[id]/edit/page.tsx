import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CorrectMarks } from "@/components/correct-marks";
import { Wizard } from "@/components/wizard";

export default async function EditQuiz({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ correction?: string }> }) {
  const adminId = await requireAdmin();
  const { correction } = await searchParams;
  const quiz = await db.quiz.findFirst({ where: { id: (await params).id, adminId }, include: {
    _count: { select: { attempts: true } },
    questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } },
  } });
  if (!quiz) notFound();
  const { id, code, published, questions, _count, ...fields } = quiz;
  const subjects = await db.subject.findMany({ where: { adminId }, orderBy: { name: "asc" }, select: { name: true } });
  return <>{typeof correction === "string" && <p className="notice" role="status">{correction.slice(0, 300)}</p>}<Wizard key={questions.map(q => q.id + ":" + q.marks).join("|")} subjects={subjects.map(subject => subject.name)} id={id} code={published ? code : undefined} locked={_count.attempts > 0} initial={{
    ...fields,
    opensAt: fields.opensAt?.toISOString() ?? null,
    expiresAt: fields.expiresAt?.toISOString() ?? null,
    questions: questions.map(q => ({ text: q.text, marks: q.marks, options: q.options.map(o => o.text), correct: q.options.findIndex(o => o.correct) })),
  }} />
  {_count.attempts > 0 && <CorrectMarks quizId={id} questions={questions.map(q => ({ id: q.id, text: q.text, marks: q.marks }))} />}
  </>;
}
