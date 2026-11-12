import { randomBytes, randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";
import { cookieOptions, hashToken } from "./auth";
import { gradeAttempt } from "./grading";
import { quizLinkClosed } from "./quiz-schedule";
import { db } from "./db";

const IN_PROGRESS = "IN_PROGRESS";
const fullscreenDeadline = (order: string): number | null => JSON.parse(order).fullscreenDeadline ?? null;
const cookieName = (id: string) => "attempt_" + id;
const studentSchema = z.object({
  name: z.string().trim().min(1).max(150),
  rollNumber: z.string().trim().min(1).max(80).transform(value => value.toUpperCase()),
  semester: z.string().trim().regex(/^(?:[1-9]|1[0-9]|20)$/, "Enter only a semester number from 1 to 20, for example 3 or 6."),
});
export const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("QUESTION_OPEN"), questionId: z.string() }),
  z.object({ type: z.literal("ANSWER"), questionId: z.string(), optionId: z.string().optional(), textAnswer: z.string().max(12000).optional() }),
  z.object({ type: z.enum(["SUBMIT", "TIME", "BLUR", "TAB_SWITCH", "FULLSCREEN_EXIT", "FULLSCREEN_RESTORED"]) }),
]);

function shuffled(ids: string[], enabled: boolean) {
  if (!enabled) return ids;
  for (let i = ids.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

async function finish(tx: Prisma.TransactionClient, id: string, status: string, submittedAt: Date) {
  const grading = await gradeAttempt(tx, id);
  await tx.quizAttempt.updateMany({
    where: { id, status: IN_PROGRESS },
    data: { status, ...grading, submittedAt, activeKey: null },
  });
  return status;
}

export async function settleExpired(adminId?: string) {
  const now = new Date();
  await db.$transaction(async tx => {
    const expired = await tx.quizAttempt.findMany({
      where: { status: IN_PROGRESS, quiz: { adminId } },
      select: { id: true, endsAt: true, questionOrder: true },
    });
    for (const attempt of expired) {
      const grace = fullscreenDeadline(attempt.questionOrder);
      if (attempt.endsAt <= now) await finish(tx, attempt.id, "EXPIRED", attempt.endsAt);
      else if (grace && grace <= now.getTime()) await finish(tx, attempt.id, "FULLSCREEN_EXIT", new Date(grace));
    }
  });
}

export async function startAttempt(code: string, input: unknown) {
  const student = studentSchema.safeParse(input);
  if (!student.success) return { error: student.error.issues.find(issue => issue.path[0] === "semester")?.message ?? "Enter your name and roll number." };
  const token = randomBytes(32).toString("hex");
  const jar = await cookies();
  const result = await db.$transaction(async tx => {
    // Serialize starts with closure and regrading so a new attempt cannot use stale marks.
    await tx.quiz.updateMany({ where: { code, published: true, admin: { suspended: false } }, data: { published: true } });
    const quiz = await tx.quiz.findUnique({
      where: { code, published: true, admin: { suspended: false } },
      include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" }, select: { id: true } } } } },
    });
    if (!quiz || !quiz.questions.length) return { error: "This quiz is unavailable." };
    if (quizLinkClosed(quiz)) return { error: "This quiz link is closed. New attempts are no longer accepted." };
    if (quiz.opensAt && quiz.opensAt.getTime() > Date.now()) return { error: "This quiz has not opened yet." };
    const person = await tx.student.upsert({
      where: { rollNumber: student.data.rollNumber }, update: {}, create: student.data,
    });
    const activeKey = quiz.id + ":" + person.id;
    const active = await tx.quizAttempt.findUnique({ where: { activeKey } });
    const now = new Date();
    if (active && active.endsAt <= now) await finish(tx, active.id, "EXPIRED", active.endsAt);
    else if (active) {
      const previousToken = jar.get(cookieName(active.id))?.value;
      if (previousToken && hashToken(previousToken) === active.tokenHash) return { id: active.id, resume: true };
      return { error: "This roll number already has an active attempt." };
    }
    if (!quiz.multipleAttempts && await tx.quizAttempt.findFirst({ where: { quizId: quiz.id, studentId: person.id } })) {
      return { error: "This roll number has already attempted the quiz." };
    }
    const optionOrders = Object.fromEntries(quiz.questions.map(q => [q.id, shuffled(q.options.map(o => o.id), quiz.randomOptions)]));
    const order = shuffled(quiz.questions.map(q => q.id), quiz.randomQuestions);
    const attempt = await tx.quizAttempt.create({
      data: {
        quizId: quiz.id, studentId: person.id, studentName: student.data.name,
        rollNumber: student.data.rollNumber, semester: student.data.semester,
        quizTitle: quiz.title, totalMarks: quiz.totalMarks, activeKey,
        tokenHash: hashToken(token), startedAt: now,
        endsAt: new Date(now.getTime() + quiz.durationMinutes * 60000),
        questionOrder: JSON.stringify({ order, optionOrders }),
      },
    });
    return { id: attempt.id, resume: false };
  });
  if ("id" in result && result.id && !result.resume) jar.set(cookieName(result.id), token, { ...cookieOptions, path: "/", maxAge: 30 * 86400 });
  return result;
}

async function tokenHash(id: string) {
  const token = (await cookies()).get(cookieName(id))?.value;
  return token ? hashToken(token) : "";
}

export async function studentState(id: string) {
  const hash = await tokenHash(id);
  if (!hash) return null;
  return db.$transaction(async tx => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id, tokenHash: hash },
      include: {
        quiz: { select: {
          requireFullscreen: true, detectTabSwitch: true, terminateOnTabSwitch: true, autoSubmit: true, showResults: true, resultsReleasedAt: true,
          questions: { select: { id: true, text: true, marks: true, durationSeconds: true, type: true, options: { select: { id: true, text: true } } } },
        } },
        answers: { select: { questionId: true, optionId: true, textAnswer: true } },
      },
    });
    if (!attempt) return null;
    const grace = fullscreenDeadline(attempt.questionOrder);
    const status = attempt.status === IN_PROGRESS && grace && grace <= Date.now()
      ? await finish(tx, id, "FULLSCREEN_EXIT", new Date(grace)) : attempt.status === IN_PROGRESS && attempt.endsAt.getTime() <= Date.now()
      ? await finish(tx, id, "EXPIRED", attempt.endsAt) : attempt.status;
    const base = { id, title: attempt.quizTitle, status, endsAt: attempt.endsAt.getTime(), serverNow: Date.now() };
    if (status !== IN_PROGRESS) {
      const graded = await tx.quizAttempt.findUniqueOrThrow({ where: { id }, select: { obtainedMarks: true, gradingPending: true } });
      return { ...base, phase: "closed" as const, gradingPending: graded.gradingPending, result: !graded.gradingPending && (attempt.quiz.showResults || attempt.quiz.resultsReleasedAt) ? { score: graded.obtainedMarks, total: attempt.totalMarks } : null };
    }
    const { questions, requireFullscreen, detectTabSwitch, terminateOnTabSwitch, autoSubmit } = attempt.quiz;
    const policy = { requireFullscreen, detectTabSwitch, terminateOnTabSwitch, autoSubmit };
    const { order, optionOrders } = JSON.parse(attempt.questionOrder) as { order: string[]; optionOrders: Record<string, string[]> };
    const byId = new Map(questions.map(q => [q.id, q]));
    return {
      ...base, phase: "active" as const, fullscreenDeadline: grace, policy, answers: Object.fromEntries(attempt.answers.map(a => [a.questionId, a.optionId ?? a.textAnswer ?? ""])),
      questions: order.map(id => {
        const q = byId.get(id)!;
        return { ...q, options: optionOrders[id].map(id => q.options.find(o => o.id === id)!) };
      }),
    };
  });
}

export async function applyEvent(id: string, event: z.infer<typeof eventSchema>) {
  const hash = await tokenHash(id);
  if (!hash) return null;
  return db.$transaction(async tx => {
    await tx.quizAttempt.updateMany({ where: { id, tokenHash: hash, status: IN_PROGRESS }, data: { status: IN_PROGRESS } });
    const a = await tx.quizAttempt.findUnique({ where: { id, tokenHash: hash }, include: { quiz: true } });
    if (!a) return null;
    if (a.status !== IN_PROGRESS) return { status: a.status };
    const now = new Date();
    const grace = fullscreenDeadline(a.questionOrder);
    if (grace && grace <= now.getTime()) return { status: await finish(tx, id, "FULLSCREEN_EXIT", new Date(grace)) };
    if (event.type === "FULLSCREEN_RESTORED") {
      const order = JSON.parse(a.questionOrder);
      delete order.fullscreenDeadline;
      await tx.quizAttempt.update({ where: { id }, data: { questionOrder: JSON.stringify(order) } });
      return { status: IN_PROGRESS };
    }
    if (event.type === "FULLSCREEN_EXIT" && a.quiz.requireFullscreen) {
      const order = JSON.parse(a.questionOrder);
      order.fullscreenDeadline ??= now.getTime() + 5000;
      await tx.quizAttempt.update({ where: { id }, data: { questionOrder: JSON.stringify(order) } });
      if (!grace) await tx.violation.create({ data: { attemptId: id, type: "FULLSCREEN_EXIT", createdAt: now } });
      return { status: IN_PROGRESS, fullscreenDeadline: order.fullscreenDeadline };
    }
    if (a.endsAt <= now) return { status: await finish(tx, id, "EXPIRED", a.endsAt) };
    if (event.type === "QUESTION_OPEN" || event.type === "ANSWER") {
      const timingQuestion = await tx.question.findFirst({ where: { id: event.questionId, quizId: a.quizId }, select: { durationSeconds: true } });
      if (!timingQuestion) return { error: "Question not found." };
      if (timingQuestion.durationSeconds) {
        const timing = JSON.parse(a.questionOrder) as { deadlines?: Record<string, number> };
        timing.deadlines ??= {};
        let deadline = timing.deadlines[event.questionId];
        if (!deadline && event.type === "QUESTION_OPEN") {
          deadline = Math.min(a.endsAt.getTime(), Date.now() + timingQuestion.durationSeconds * 1000);
          timing.deadlines[event.questionId] = deadline;
          await tx.quizAttempt.update({ where: { id }, data: { questionOrder: JSON.stringify(timing) } });
        }
        if (event.type === "QUESTION_OPEN") return { status: IN_PROGRESS, deadline, serverNow: Date.now() };
        if (!deadline || Date.now() >= deadline) return { error: "Question time has ended. This answer is locked." };
      }
      if (event.type === "QUESTION_OPEN") return { status: IN_PROGRESS, deadline: null, serverNow: Date.now() };
    }
    if (event.type === "ANSWER") {
      const question = await tx.question.findFirst({ where: { id: event.questionId, quizId: a.quizId }, select: { id: true, type: true } });
      if (!question) return { error: "Question not found in this quiz." };
      let optionId: string | null = null;
      let textAnswer: string | null = null;
      if (question.type === "MCQ") {
        if (!event.optionId) return { error: "Select one option." };
        const option = await tx.option.findFirst({ where: { id: event.optionId, questionId: question.id }, select: { id: true } });
        if (!option) return { error: "This option does not belong to the question." };
        optionId = option.id;
      } else {
        if (typeof event.textAnswer !== "string") return { error: "Enter a text answer." };
        textAnswer = event.textAnswer;
        if (!textAnswer.trim()) {
          await tx.studentAnswer.deleteMany({ where: { attemptId: id, questionId: question.id } });
          return { status: IN_PROGRESS };
        }
      }
      await tx.studentAnswer.upsert({
        where: { attemptId_questionId: { attemptId: id, questionId: question.id } },
        update: { optionId, textAnswer, awardedMarks: null },
        create: { attemptId: id, questionId: question.id, optionId, textAnswer },
      });
    } else if (event.type === "SUBMIT") {
      return { status: await finish(tx, id, "SUBMITTED", now) };
    } else if (event.type === "BLUR" || (event.type === "TAB_SWITCH" && (a.quiz.detectTabSwitch || !!grace)) ||
      (event.type === "FULLSCREEN_EXIT" && a.quiz.requireFullscreen)) {
      await tx.violation.create({ data: { attemptId: id, type: event.type, createdAt: now } });
      if (event.type === "FULLSCREEN_EXIT" || (event.type === "TAB_SWITCH" && (a.quiz.terminateOnTabSwitch || !!grace))) {
        return { status: await finish(tx, id, event.type, now) };
      }
    }
    return { status: IN_PROGRESS };
  });
}



