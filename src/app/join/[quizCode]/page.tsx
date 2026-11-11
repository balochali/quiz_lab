import { notFound } from "next/navigation";
import { quizLinkClosed, upcomingOpening } from "@/lib/quiz-schedule";
import { db } from "@/lib/db";
import { WaitingRoom } from "@/components/waiting-room";
import { Exam } from "@/components/exam";

export default async function Join({ params }: { params: Promise<{ quizCode: string }> }) {
  const { quizCode } = await params;
  const quiz = await db.quiz.findUnique({ where: { code: quizCode, published: true, admin: { suspended: false } }, select: {
    opensAt: true, expiresAt: true, closedAt: true, code: true, title: true, course: true, durationMinutes: true, instructions: true, description: true,
    requireFullscreen: true, detectTabSwitch: true, terminateOnTabSwitch: true, _count: { select: { questions: true } },
  } });
  if (!quiz) notFound();
  if (quizLinkClosed(quiz)) return <main className="narrow card">
    <p className="eyebrow">{quiz.course}</p>
    <h1>{quiz.title}</h1>
    <h2>This quiz link is closed</h2>
    <p>New attempts are no longer accepted.</p>
  </main>;
  const opening = upcomingOpening(quiz.opensAt);
  if (opening) return <WaitingRoom title={quiz.title} course={quiz.course} {...opening} />;
  const { opensAt, expiresAt, closedAt, ...availableQuiz } = quiz;
  void opensAt;
  void expiresAt;
  void closedAt;
  return <Exam quiz={availableQuiz} />;
}
