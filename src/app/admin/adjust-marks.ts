"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminId } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustmentHistory } from "@/lib/score-adjustments";

export async function adjustAttemptMarks(input: unknown) {
  const actorId = await adminId();
  if (!actorId) return { error: "Your session expired. Sign in again." };
  const actor = await db.admin.findUniqueOrThrow({ where: { id: actorId }, select: { email: true, role: true, canCorrectMarks: true } });
  if (actor.role !== "SUPER_ADMIN" && !actor.canCorrectMarks) return { error: "Mark adjustments are disabled for your account." };
  const parsed = z.object({ attemptId: z.string().min(1), marks: z.number().int().min(0).max(100000).nullable(), reason: z.string().trim().min(3, "Enter a reason for the adjustment.").max(1000), expectedAdjusted: z.number().nullable(), expectedOriginal: z.number(), expectedTotal: z.number() }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  try {
    const result = await db.$transaction(async tx => {
      const owned = await tx.quizAttempt.findFirst({ where: { id: data.attemptId, quiz: { adminId: actorId } }, select: { quizId: true } });
      if (!owned) return { error: "Student attempt not found." };
      await tx.quiz.updateMany({ where: { id: owned.quizId, adminId: actorId }, data: { id: owned.quizId } });
      await tx.quizAttempt.updateMany({ where: { id: data.attemptId }, data: { id: data.attemptId } });
      const attempt = await tx.quizAttempt.findUniqueOrThrow({ where: { id: data.attemptId } });
      if (attempt.status === "IN_PROGRESS" || !attempt.submittedAt) return { error: "Wait until the attempt has ended." };
      if (attempt.gradingPending) return { error: "Finish written-answer grading before adjusting the final marks." };
      if (data.marks !== null && data.marks > attempt.totalMarks) return { error: `Updated marks must be between 0 and ${attempt.totalMarks}.` };
      if (attempt.adjustedMarks !== data.expectedAdjusted || attempt.obtainedMarks !== data.expectedOriginal || attempt.totalMarks !== data.expectedTotal) return { error: "This score changed since you opened it. Refresh results and try again." };
      const history = adjustmentHistory(attempt.markAdjustments);
      history.push({ actorId, actorEmail: actor.email, at: new Date().toISOString(), from: attempt.adjustedMarks, to: data.marks, originalScore: attempt.obtainedMarks, totalMarks: attempt.totalMarks, reason: data.reason });
      await tx.quizAttempt.update({ where: { id: attempt.id }, data: { adjustedMarks: data.marks, markAdjustments: JSON.stringify(history) } });
      return { success: true as const };
    });
    if ("success" in result) {
      revalidatePath("/admin/results"); revalidatePath("/admin/results/" + data.attemptId);
      revalidatePath("/admin/quizzes/[id]/leaderboard", "page"); revalidatePath("/quiz/[attemptId]/result", "page"); revalidatePath("/admin/platform", "layout");
    }
    return result;
  } catch { return { error: "Could not save the adjustment. Your original marks are unchanged. Try again." }; }
}
