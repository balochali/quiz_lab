import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { answerScore } from "@/lib/grading";
import { statusLabel } from "@/lib/quiz-schema";
export default async function AttemptDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const attempt = await db.quizAttempt.findUnique({ where: { id: (await params).id }, select: {
    studentName: true, rollNumber: true, semester: true, quizTitle: true, obtainedMarks: true, totalMarks: true,
    status: true, gradingPending: true, startedAt: true, submittedAt: true,
    answers: { select: { id: true, textAnswer: true, awardedMarks: true, question: { select: { text: true, marks: true, type: true, acceptedAnswers: true } }, option: { select: { text: true, correct: true } } } },
    violations: { select: { id: true, type: true, createdAt: true }, orderBy: { createdAt: "asc" } },
  } });
  if (!attempt) notFound();
  return <><section className="card stack"><h2>{attempt.studentName}</h2><p>{attempt.rollNumber} · Semester {attempt.semester} · {attempt.quizTitle}</p>
    <p>{statusLabel(attempt.status)}</p><p>Started {attempt.startedAt.toISOString()}</p>
    {attempt.submittedAt && <><p>Submitted {attempt.submittedAt.toISOString()}</p><strong>{attempt.gradingPending ? "Awaiting grading" : attempt.obtainedMarks + " / " + attempt.totalMarks}</strong></>}
  </section><section className="card stack"><h2>Saved answers</h2>{attempt.answers.map(answer => <article key={answer.id}>
    <h3>{answer.question.text}</h3><p>{answer.option?.text ?? answer.textAnswer} · {answer.question.type === "THEORY" && answer.awardedMarks === null ? "Pending" : answerScore(answer)} / {answer.question.marks} marks</p>
  </article>)}</section><section className="card stack"><h2>Monitoring events</h2>{attempt.violations.map(event =>
    <p key={event.id}>{event.type} · {event.createdAt.toISOString()}</p>)}</section></>;
}
