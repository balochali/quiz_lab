import Link from "next/link";
import { notFound } from "next/navigation";
import { closeQuizLink, releaseResults } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settleExpired } from "@/lib/attempt";
import { formatQuizOpening, quizLinkClosed } from "@/lib/quiz-schedule";
import { statusLabel } from "@/lib/quiz-schema";

export default async function Leaderboard({ params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin();
  const { id } = await params;
  const quiz = await db.quiz.findFirst({
    where: { id, adminId, published: true },
    select: { title: true, course: true, showResults: true, resultsReleasedAt: true, expiresAt: true, closedAt: true },
  });
  if (!quiz) notFound();
  const linkClosed = quizLinkClosed(quiz);
  await settleExpired(adminId);
  const attempts = await db.quizAttempt.findMany({
    where: { quizId: id, quiz: { adminId }, submittedAt: { not: null }, gradingPending: false },
    orderBy: [{ obtainedMarks: "desc" }, { submittedAt: "asc" }, { id: "asc" }],
    select: { id: true, studentName: true, rollNumber: true, obtainedMarks: true, totalMarks: true, status: true },
  });
  const seenRollNumbers = new Set<string>();
  const bestAttempts = attempts.filter(attempt => {
    if (seenRollNumbers.has(attempt.rollNumber)) return false;
    seenRollNumbers.add(attempt.rollNumber);
    return true;
  });
  let rank = 0;
  const ranked: (typeof bestAttempts[number] & { rank: number })[] = [];
  for (const [index, attempt] of bestAttempts.entries()) {
    if (attempt.obtainedMarks !== bestAttempts[index - 1]?.obtainedMarks) rank = index + 1;
    ranked.push({ ...attempt, rank });
  }
  return <>
    <header className="stack">
      <Link href="/admin/quizzes">← Quiz library</Link>
      <div><p className="eyebrow">{quiz.course}</p><h1>Leaderboard</h1><p>{quiz.title}</p></div>
    </header>
    <section className="card stack">
      <h2>Quiz link</h2>
      {linkClosed ? <p role="status">The link is closed to new attempts.</p> : <>
        <p>{quiz.expiresAt ? "New attempts close at " + formatQuizOpening(quiz.expiresAt.getTime()) + "." : "No expiration is scheduled."}</p>
        <p className="muted">Students already taking the quiz can finish within their own time limit.</p>
        <form action={closeQuizLink.bind(null, id)}><button>Close link now</button></form>
      </>}
    </section>
    <section className="card stack">
      <h2>Student results</h2>
      {quiz.showResults ? <p>Students see their score when their attempt finishes.</p> :
        quiz.resultsReleasedAt ? <p role="status">Scores have been released to students.</p> :
          <><p>Scores are private until you release them. Students with an open result page will see their own score automatically.</p>
            <form action={releaseResults.bind(null, id)}><button className="primary">Release results to students</button></form></>}
    </section>
    <section className="card scroll stack">
      <h2>Rankings</h2>
      <p className="muted">Best fully graded attempt per roll number. Equal scores share a rank.</p>
      {ranked.length ? <table>
        <thead><tr><th>Rank</th><th>Student</th><th>Roll number</th><th>Score</th><th>Status</th></tr></thead>
        <tbody>{ranked.map(attempt => <tr key={attempt.id}><td>{attempt.rank}</td>
            <td><Link href={"/admin/results/" + attempt.id}>{attempt.studentName}</Link></td>
            <td>{attempt.rollNumber}</td><td>{attempt.obtainedMarks} / {attempt.totalMarks}</td><td>{statusLabel(attempt.status)}</td>
          </tr>)}</tbody>
      </table> : <p>No finalized attempts yet.</p>}
    </section>
  </>;
}
