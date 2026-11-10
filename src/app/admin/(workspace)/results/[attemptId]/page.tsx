import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { settleExpired } from "@/lib/attempt";
import { db } from "@/lib/db";
import { statusLabel } from "@/lib/quiz-schema";

export default async function Detail({ params }: { params: Promise<{ attemptId: string }> }) {
  const adminId = await requireAdmin();
  await settleExpired(adminId);
  const attempt = await db.quizAttempt.findFirst({
    where: { id: (await params).attemptId, quiz: { adminId } },
    include: { violations: { orderBy: { createdAt: "asc" } }, answers: { select: { questionId: true, optionId: true } },
      quiz: { select: { questions: { orderBy: { position: "asc" }, include: { options: true } } } } },
  });
  if (!attempt) notFound();
  const answers = new Map(attempt.answers.map(answer => [answer.questionId, answer.optionId]));
  return <>
    <header><Link href="/admin/results">← Results</Link><h1>{attempt.studentName}</h1><p>{attempt.rollNumber} · {attempt.semester} · {attempt.quizTitle}</p></header>
    <section className="card stack"><h2>{statusLabel(attempt.status)}</h2>
      <p>Started {attempt.startedAt.toISOString()}</p>
      {attempt.submittedAt && <><p>Submitted {attempt.submittedAt.toISOString()}</p><strong>{attempt.obtainedMarks} / {attempt.totalMarks} marks</strong></>}
    </section>
    <section className="card stack"><h2>Saved answers</h2>{attempt.quiz.questions.map((question, index) => {
      const selected = question.options.find(option => option.id === answers.get(question.id));
      return <article className="question-editor" key={question.id}>
        <h3>{index + 1}. {question.text}</h3><p>Selected: {selected?.text ?? "Unanswered"}</p>
        <p>Correct: {question.options.find(option => option.correct)?.text} · {selected?.correct ? question.marks : 0}/{question.marks} marks</p>
      </article>;
    })}</section>
    <section className="card stack"><h2>Monitoring events ({attempt.violations.length})</h2>
      {attempt.violations.length ? <ul>{attempt.violations.map(event => <li key={event.id}>
        {event.type === "BLUR" ? "Window lost focus (informational)" : event.type === "TAB_SWITCH" ? "Tab became hidden" : "Exited fullscreen"} · {event.createdAt.toISOString()}
      </li>)}</ul> : <p>No monitoring events recorded.</p>}
    </section>
  </>;
}
