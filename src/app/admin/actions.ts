"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminId as authenticatedAdminId, login, requireAdmin, verifyPassword } from "@/lib/auth";
import { getQuizIssues } from "@/lib/quiz-validation";
import { quizSchema } from "@/lib/quiz-schema";

export async function signIn(_: string, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || email.length > 254 || !password || password.length > 256) return "Enter a valid email and password.";
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin || !verifyPassword(password, admin.passwordHash)) return "Email or password is incorrect.";
  if (!admin.verifiedAt) return "Confirm your email before signing in.";
  if (admin.suspended) return "Your account is suspended. Contact the platform administrator.";
  await login(admin.id);
  redirect(admin.role === "SUPER_ADMIN" ? "/admin/platform" : "/admin/dashboard");
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
  try {
    const adminId = await authenticatedAdminId();
    if (!adminId) return { error: "Your session has expired or your account is suspended. Sign in again or contact your administrator." };
    const account = await db.admin.findUniqueOrThrow({ where: { id: adminId }, select: { role: true, canCreateQuizzes: true, canPublishQuizzes: true } });
    if (account.role !== "SUPER_ADMIN") {
      if (!id && !account.canCreateQuizzes) return { error: "Quiz creation is disabled for your account. Contact your platform administrator." };
      if (publish && !account.canPublishQuizzes) return { error: "Publishing is disabled for your account. You can save a draft or contact your platform administrator." };
    }
    const issues = getQuizIssues(input, publish);
    if (issues.length) return { error: "Fix the highlighted quiz fields before " + (publish ? "publishing." : "saving."), issues };
    const parsed = quizSchema.safeParse(input);
    if (!parsed.success) return { error: "The quiz data is invalid. Refresh the page and try again." };
    const { questions, opensAt, expiresAt, ...settings } = parsed.data;
    const fields = {
      ...settings,
      opensAt: opensAt ? new Date(opensAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    };
    const create = questions.map((question, position) => ({
      text: question.text, type: question.type, acceptedAnswers: JSON.stringify(question.acceptedAnswers), marks: question.marks, durationSeconds: question.durationSeconds ?? null, position,
      options: { create: question.type === "MCQ" ? question.options.map((text, index) => ({ text, position: index, correct: index === question.correct })) : [] },
    }));
    return await db.$transaction(async (tx) => {
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
  } catch (error) {
    const code = (error as { code?: string })?.code;
    console.error("Quiz save failed", { code: code ?? "unknown" });
    if (["P1001", "P1002", "P1008", "P1017"].includes(code ?? "")) return { error: "The database could not be reached. Your changes have not been saved. Try again shortly." };
    if (["P2028", "P2034"].includes(code ?? "")) return { error: "The quiz was busy or changed during saving. Try saving again." };
    return { error: "The server could not save this quiz. Keep this page open and try again. If it continues, contact the administrator." };
  }
}
