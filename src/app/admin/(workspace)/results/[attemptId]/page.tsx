import Link from "next/link";
import { CheckCircle2, XCircle, Clock, MinusCircle, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { settleExpired } from "@/lib/attempt";
import { db } from "@/lib/db";
import { statusLabel, questionTypes } from "@/lib/quiz-schema";
import { answerScore } from "@/lib/grading";
import { gradeTheory } from "@/app/admin/grade-theory";
import { AnswerTabs } from "@/components/answer-tabs";

export default async function Detail({ params, searchParams }: {
  params: Promise<{ attemptId: string }>; searchParams: Promise<{ grading?: string }>;
}) {
  const adminId = await requireAdmin();
  await settleExpired(adminId);
  const { grading } = await searchParams;
  const attempt = await db.quizAttempt.findFirst({
    where: { id: (await params).attemptId, quiz: { adminId } },
    include: { violations: { orderBy: { createdAt: "asc" } }, answers: { include: { option: true } },
      quiz: { select: { questions: { orderBy: { position: "asc" }, include: { options: true } } } } },
  });
  if (!attempt) notFound();
  const answers = new Map(attempt.answers.map(answer => [answer.questionId, answer]));
  const answerStates = attempt.quiz.questions.map(question => {
    const answer = answers.get(question.id);
    if (!(answer?.option || answer?.textAnswer?.trim())) return "unanswered";
    if (question.type === "THEORY" && answer.awardedMarks === null) return "pending";
    const score = answerScore({ ...answer, question });
    return score === question.marks ? "correct" : score > 0 ? "partial" : "incorrect";
  });
  return <>
    <header className="result-detail-header"><Link href="/admin/results">← All results</Link><p className="eyebrow">Student assessment review</p><h1>{attempt.studentName}</h1><div className="result-identity"><span>{attempt.rollNumber}</span><span>Semester: {attempt.semester}</span><span>{attempt.quizTitle}</span></div></header>
    {typeof grading === "string" && <p className="notice" role="status">{grading.slice(0, 300)}</p>}
    <section className="card stack result-attempt-summary"><span className="eyebrow">Attempt overview</span><h2>{statusLabel(attempt.status)}</h2>
      <p>Started {attempt.startedAt.toISOString()}</p>
      {attempt.submittedAt && <><p>Submitted {attempt.submittedAt.toISOString()}</p>
        <strong>{attempt.gradingPending ? "Awaiting written-answer grading" : attempt.obtainedMarks + " / " + attempt.totalMarks + " marks"}</strong></>}
    </section>
    <section className="card stack result-answer-section"><div><p className="eyebrow">Question by question</p><h2>Answer review</h2><p className="muted">Green: correct · Red: incorrect · Amber: partial marks or awaiting grading · Gray: unanswered</p></div><AnswerTabs states={answerStates}>{attempt.quiz.questions.map((question, index) => {
      const answer = answers.get(question.id);
      const score = answer ? answerScore({ ...answer, question }) : 0;
      const answered = !!(answer?.option || answer?.textAnswer?.trim());
      const pending = question.type === "THEORY" && answered && answer?.awardedMarks == null;
      const state = !answered ? "unanswered" : pending ? "pending" : score === question.marks ? "correct" : score > 0 ? "partial" : "incorrect";
      const label = { unanswered: "Unanswered", pending: "Awaiting grading", correct: "Correct", partial: "Partial marks", incorrect: "Incorrect" }[state];
      const Icon = state === "correct" ? CheckCircle2 : state === "incorrect" ? XCircle : state === "unanswered" ? MinusCircle : Clock;
      return <article className={"question-editor stack answer-review answer-review-" + state} key={question.id}>
        <div className="row between wrap"><span className="answer-number">Question {index + 1}</span><span className="answer-outcome"><Icon size={17} />{label} · {pending ? "Not graded" : score + " / " + question.marks + " marks"}</span></div>
        <div><p className="eyebrow">{questionTypes[question.type as keyof typeof questionTypes]}</p><h3>{index + 1}. {question.text}</h3></div>
        <div className="answer-student multiline"><span className="eyebrow">Student answer</span><p>{answer?.option?.text ?? answer?.textAnswer ?? "Unanswered"}</p></div>
        {question.type === "MCQ" && <p>Correct: {question.options.find(option => option.correct)?.text}</p>}
        {question.type === "BLANK" && <p>Accepted answers: {(JSON.parse(question.acceptedAnswers) as string[]).join(" / ")}</p>}
        <p>{question.type === "THEORY" && answer && answer.awardedMarks === null ? "Not graded" : score + " / " + question.marks + " marks"}</p>
        {question.type === "THEORY" && answer && attempt.status !== "IN_PROGRESS" && <form className="row wrap" action={gradeTheory.bind(null, attempt.id)}>
          <input type="hidden" name="answerId" value={answer.id} />
          <label>Award marks (0–{question.marks})<input name="marks" type="number" min={0} max={question.marks} step={1} required defaultValue={answer.awardedMarks ?? 0} /></label>
          <button className="primary">{answer.awardedMarks === null ? "Grade answer" : "Update grading"}</button>
        </form>}
      </article>;
    })}</AnswerTabs></section>
    <section className="card stack result-monitoring"><h2><ShieldCheck size={23} /> Monitoring events ({attempt.violations.length})</h2>
      {attempt.violations.length ? <ul>{attempt.violations.map(event => <li key={event.id}>
        {event.type === "BLUR" ? "Window lost focus (informational)" : event.type === "TAB_SWITCH" ? "Tab became hidden" : "Exited fullscreen"} · {event.createdAt.toISOString()}
      </li>)}</ul> : <p>No monitoring events recorded.</p>}
    </section>
  </>;
}
