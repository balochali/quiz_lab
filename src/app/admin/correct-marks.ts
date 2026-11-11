"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { settleExpired } from "@/lib/attempt";
import { gradeAttempt } from "@/lib/grading";
import { quizLinkClosed } from "@/lib/quiz-schedule";

export async function correctMarks(quizId: string, form: FormData) {
  const adminId = await requirePermission("canCorrectMarks");
  const parsed = z.object({
    questionId: z.string().min(1),
    marks: z.coerce.number().int().min(1).max(1000),
    expectedMarks: z.coerce.number().int().min(1).max(1000),
    confirmed: z.literal("on"),
  }).safeParse(Object.fromEntries(form));
  const destination = "/admin/quizzes/" + encodeURIComponent(quizId) + "/edit?correction=";
  if (!parsed.success) redirect(destination + encodeURIComponent("Choose the question, enter marks from 1 to 1000, and confirm regrading."));
  await settleExpired(adminId);
  let message: string;
  try {
    message = await db.$transaction(async tx => {
      // Starts acquire the same quiz row before reading the grading rules.
      const locked = await tx.quiz.updateMany({ where: { id: quizId, adminId }, data: { id: quizId } });
      if (!locked.count) return "Quiz not found.";
      const quiz = await tx.quiz.findUniqueOrThrow({
        where: { id: quizId },
        select: { expiresAt: true, closedAt: true, questions: { select: { id: true, marks: true } } },
      });
      if (!quizLinkClosed(quiz)) return "Close the student link in Link & leaderboard before correcting marks.";
      if (await tx.quizAttempt.count({ where: { quizId, status: "IN_PROGRESS" } })) {
        return "Some students are still taking the quiz. Wait until their attempts finish.";
      }
      const question = quiz.questions.find(q => q.id === parsed.data.questionId);
      if (!question) return "Question not found in this quiz.";
      if (question.marks !== parsed.data.expectedMarks) return "The marks changed since you opened this page. Refresh before trying again.";
      if (question.marks === parsed.data.marks) return "No change needed. The question already has these marks.";
      const totalMarks = quiz.questions.reduce((sum, q) =>
        sum + (q.id === question.id ? parsed.data.marks : q.marks), 0);
      await tx.question.update({ where: { id: question.id }, data: { marks: parsed.data.marks } });
      await tx.studentAnswer.updateMany({ where: { questionId: question.id, awardedMarks: { gt: parsed.data.marks } }, data: { awardedMarks: parsed.data.marks } });
      await tx.quiz.update({ where: { id: quizId }, data: { totalMarks } });
      const attempts = await tx.quizAttempt.findMany({
        where: { quizId },
        select: { id: true },
      });
      for (const attempt of attempts) {
        await tx.quizAttempt.update({ where: { id: attempt.id },
          data: { totalMarks, ...await gradeAttempt(tx, attempt.id) } });
      }
      return `Updated question marks from ${question.marks} to ${parsed.data.marks}. Regraded ${attempts.length} attempts. Quiz total is now ${totalMarks}.`;
    }, { timeout: 30000 });
    revalidatePath("/admin/quizzes/" + quizId + "/edit");
    revalidatePath("/admin/quizzes/" + quizId + "/leaderboard");
    revalidatePath("/admin/results");
    revalidatePath("/quiz/[attemptId]/result", "page");
  } catch {
    message = "Unable to correct marks. No changes were saved. Please try again.";
  }
  redirect(destination + encodeURIComponent(message));
}
