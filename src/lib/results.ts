import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { settleExpired } from "./attempt";
import { statuses } from "./quiz-schema";

export async function findResults(adminId: string, filters: { q?: string; quiz?: string; semester?: string; status?: string }) {
  await settleExpired(adminId);
  const q = filters.q?.trim().slice(0, 150);
  const where: Prisma.QuizAttemptWhereInput = {
    quiz: { adminId },
    quizId: filters.quiz || undefined,
    semester: filters.semester || undefined,
    status: filters.status && Object.hasOwn(statuses, filters.status) ? filters.status : undefined,
    OR: q ? [{ studentName: { contains: q } }, { rollNumber: { contains: q.toUpperCase() } }] : undefined,
  };
  return db.quizAttempt.findMany({
    where, orderBy: { startedAt: "desc" },
    select: {
      id: true, quizTitle: true, studentName: true, rollNumber: true, semester: true,
      obtainedMarks: true, totalMarks: true, gradingPending: true, status: true, submittedAt: true,
      _count: { select: { violations: true } },
    },
  });
}
