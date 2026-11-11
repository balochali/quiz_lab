"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeAttempt } from "@/lib/grading";

export async function gradeTheory(attemptId: string, form: FormData) {
  const adminId = await requireAdmin();
  const destination = "/admin/results/" + encodeURIComponent(attemptId);
  const parsed = z.object({ answerId: z.string().min(1), marks: z.coerce.number().int().min(0).max(1000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(destination + "?grading=" + encodeURIComponent("Enter whole-number marks from zero to the question maximum."));
  let message: string;
  try {
    message = await db.$transaction(async tx => {
      const attempt = await tx.quizAttempt.findFirst({ where: { id: attemptId, quiz: { adminId } }, select: { quizId: true } });
      if (!attempt) return "Attempt not found.";
      await tx.quiz.updateMany({ where: { id: attempt.quizId, adminId }, data: { id: attempt.quizId } });
      const locked = await tx.quizAttempt.updateMany({ where: { id: attemptId, status: { not: "IN_PROGRESS" } }, data: { id: attemptId } });
      if (!locked.count) return "Wait until the student finishes the attempt.";
      const answer = await tx.studentAnswer.findFirst({
        where: { id: parsed.data.answerId, attemptId, question: { type: "THEORY" } },
        select: { id: true, question: { select: { marks: true } } },
      });
      if (!answer) return "Written answer not found in this attempt.";
      if (parsed.data.marks > answer.question.marks) return "Marks cannot exceed " + answer.question.marks + " for this question.";
      await tx.studentAnswer.update({ where: { id: answer.id }, data: { awardedMarks: parsed.data.marks } });
      await tx.quizAttempt.update({ where: { id: attemptId }, data: await gradeAttempt(tx, attemptId) });
      return "Written answer graded. The attempt score has been updated.";
    });
  } catch { message = "Unable to save grading. Please try again."; }
  revalidatePath("/admin/results");
  revalidatePath(destination);
  revalidatePath("/quiz/[attemptId]/result", "page");
  revalidatePath("/admin/quizzes/[id]/leaderboard", "page");
  redirect(destination + "?grading=" + encodeURIComponent(message));
}
