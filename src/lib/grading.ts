import type { Prisma } from "@prisma/client";

type GradingAnswer = {
  option: { correct: boolean } | null;
  question: { marks: number; type?: string; acceptedAnswers?: string };
  textAnswer?: string | null;
  awardedMarks?: number | null;
};
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export function answerScore(answer: GradingAnswer) {
  if (answer.question.type === "THEORY") return Math.min(answer.question.marks, Math.max(0, answer.awardedMarks ?? 0));
  if (answer.question.type === "BLANK") {
    const accepted: string[] = JSON.parse(answer.question.acceptedAnswers ?? "[]");
    return accepted.some(value => normalize(value) === normalize(answer.textAnswer ?? "")) ? answer.question.marks : 0;
  }
  return answer.option?.correct ? answer.question.marks : 0;
}
export function calculateScore(answers: GradingAnswer[]) {
  return answers.reduce((score, answer) => score + answerScore(answer), 0);
}
export async function gradeAttempt(tx: Prisma.TransactionClient, id: string) {
  const answers = await tx.studentAnswer.findMany({ where: { attemptId: id }, select: {
    option: { select: { correct: true } }, textAnswer: true, awardedMarks: true,
    question: { select: { marks: true, type: true, acceptedAnswers: true } },
  } });
  return {
    obtainedMarks: calculateScore(answers),
    gradingPending: answers.some(answer => answer.question.type === "THEORY" && !!answer.textAnswer?.trim() && answer.awardedMarks === null),
  };
}
