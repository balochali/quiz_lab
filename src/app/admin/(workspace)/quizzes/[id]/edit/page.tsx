import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Wizard } from "@/components/wizard";

export default async function EditQuiz({ params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin();
  const quiz = await db.quiz.findFirst({ where: { id: (await params).id, adminId }, include: {
    _count: { select: { attempts: true } },
    questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } },
  } });
  if (!quiz) notFound();
  const { id, code, published, questions, _count, ...fields } = quiz;
  const subjects = await db.subject.findMany({ where: { adminId }, orderBy: { name: "asc" }, select: { name: true } });
  return <Wizard subjects={subjects.map(subject => subject.name)} id={id} code={published ? code : undefined} locked={_count.attempts > 0} initial={{
    ...fields,
    opensAt: fields.opensAt?.toISOString() ?? null,
    expiresAt: fields.expiresAt?.toISOString() ?? null,
    questions: questions.map(q => ({ text: q.text, marks: q.marks, options: q.options.map(o => o.text), correct: q.options.findIndex(o => o.correct) })),
  }} />;
}
