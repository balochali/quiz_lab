"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { login, requireAdmin, verifyPassword } from "@/lib/auth";
import { quizSchema } from "@/lib/quiz-schema";

export async function signIn(_: string, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || email.length > 254 || !password || password.length > 256) return "Enter a valid email and password.";
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin || !verifyPassword(password, admin.passwordHash)) return "Email or password is incorrect.";
  if (!admin.verifiedAt) return "Confirm your email before signing in.";
  await login(admin.id);
  redirect("/admin/dashboard");
}

export async function signOut() {
  (await cookies()).delete("lecturer");
  redirect("/admin/login");
}

export async function deleteQuiz(id: string) {
  const adminId = await requireAdmin();
  await db.$transaction(async tx => {
    const quiz = await tx.quiz.findFirst({ where: { id, adminId }, select: { id: true } });
    if (!quiz) notFound();
    const attempt = { quizId: id };
    await tx.studentAnswer.deleteMany({ where: { attempt } });
    await tx.violation.deleteMany({ where: { attempt } });
    await tx.quizAttempt.deleteMany({ where: attempt });
    await tx.quiz.delete({ where: { id, adminId } });
  });
  revalidatePath("/admin/dashboard");
  redirect("/admin/quizzes");
}

export async function closeQuizLink(id: string) {
  const adminId = await requireAdmin();
  const quiz = await db.quiz.findFirst({ where: { id, adminId, published: true }, select: { id: true } });
  if (!quiz) notFound();
  await db.quiz.updateMany({
    where: { id, adminId, published: true, closedAt: null },
    data: { closedAt: new Date() },
  });
  redirect("/admin/quizzes/" + id + "/leaderboard");
}

export async function releaseResults(id: string) {
  const adminId = await requireAdmin();
  const quiz = await db.quiz.findFirst({ where: { id, adminId, published: true }, select: { resultsReleasedAt: true } });
  if (!quiz) notFound();
  if (!quiz.resultsReleasedAt) await db.quiz.updateMany({ where: { id, adminId, published: true, resultsReleasedAt: null }, data: { resultsReleasedAt: new Date() } });
  redirect("/admin/quizzes/" + id + "/leaderboard");
}

export async function saveQuiz(id: string | undefined, input: unknown, publish: boolean) {
  const adminId = await requireAdmin();
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the quiz fields and fill in all four options for each question." };
  const { questions, opensAt, expiresAt, ...settings } = parsed.data;
  if (opensAt && expiresAt && Date.parse(expiresAt) <= Date.parse(opensAt)) {
    return { error: "Set the link expiration after the quiz opening time." };
  }
  const fields = {
    ...settings,
    opensAt: opensAt ? new Date(opensAt) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  };
  if (publish && (!questions.length || questions.reduce((sum, q) => sum + q.marks, 0) !== fields.totalMarks)) {
    const assigned = questions.reduce((sum, question) => sum + question.marks, 0);
    return { error: questions.length ? `Your questions add up to ${assigned} marks. Assign ${fields.totalMarks} marks or change the quiz total.` : "Add at least one question before publishing." };
  }
  const create = questions.map((question, position) => ({
    text: question.text, marks: question.marks, position,
    options: { create: question.options.map((text, index) => ({ text, position: index, correct: index === question.correct })) },
  }));
  return db.$transaction(async (tx) => {
    const subject = await tx.subject.findFirst({ where: { adminId, name: fields.course } });
    if (!subject) return { error: "Select a subject from your lecturer workspace." };
    fields.course = subject.name;
    if (id) {
      const existing = await tx.quiz.findFirst({ where: { id, adminId }, include: { _count: { select: { attempts: true } } } });
      if (!existing) return { error: "Quiz not found." };
      if (existing._count.attempts) return { error: "This quiz has attempts. Create a new quiz to change its content or settings." };
      await tx.question.deleteMany({ where: { quizId: id } });
      const quiz = await tx.quiz.update({ where: { id }, data: { ...fields, published: publish, questions: { create } } });
      return { id: quiz.id, code: quiz.code, published: quiz.published };
    }
    const quiz = await tx.quiz.create({ data: { ...fields, adminId, published: publish, questions: { create } } });
    return { id: quiz.id, code: quiz.code, published: quiz.published };
  });
}
