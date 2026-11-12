import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const tag = randomUUID();
const origin = process.env.QUIZ_TEST_ORIGIN ?? "http://localhost:3000";

async function call(path, body, cookie) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, cookie: response.headers.get("set-cookie")?.split(";")[0], data: await response.json() };
}

const admin = await db.admin.create({ data: { email: tag + "@example.test", passwordHash: "test-fixture", verifiedAt: new Date() } });
let quiz;
try {
  quiz = await db.quiz.create({ data: {
    adminId: admin.id, title: "Smoke test", course: "CS", semester: "1", description: "", instructions: "",
    durationMinutes: 10, totalMarks: 2, published: true,
    questions: { create: { text: "Which option is correct?", position: 0, marks: 2, options: {
      create: ["One", "Two", "Three", "Four"].map((text, position) => ({ text, position, correct: position === 1 })),
    } } },
  }, include: { questions: { include: { options: true } } } });
  const join = "/api/join/" + quiz.code;
  const student = { name: "Test student", rollNumber: tag, semester: "1" };
  await db.quiz.update({ where: { id: quiz.id }, data: { opensAt: new Date(Date.now() + 600000) } });
  const waitingPage = await fetch(origin + "/join/" + quiz.code);
  const waitingHtml = await waitingPage.text();
  assert.equal(waitingPage.status, 200);
  assert.match(waitingHtml, /Time until quiz opens/);
  assert.doesNotMatch(waitingHtml, /Which option is correct\?|Start quiz/);
  assert.equal((await call(join, student)).status, 409);
  await db.quiz.update({ where: { id: quiz.id }, data: { opensAt: new Date(Date.now() - 1000) } });
  const openPage = await fetch(origin + "/join/" + quiz.code);
  assert.match(await openPage.text(), /Start quiz/);
  const first = await call(join, student);
  assert.equal(first.status, 200);
  const attempt = "/api/attempt/" + first.data.id;
  assert.equal((await call(join, student)).status, 409);
  const laterStudent = { ...student, rollNumber: tag + "-closed" };
  await db.quiz.update({ where: { id: quiz.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await call(join, laterStudent)).status, 409);
  const closedHtml = await (await fetch(origin + "/join/" + quiz.code)).text();
  assert.match(closedHtml, /This quiz link is closed/);
  assert.doesNotMatch(closedHtml, /Start quiz/);
  assert.equal((await call(attempt, undefined, first.cookie)).data.status, "IN_PROGRESS");
  await db.quiz.update({ where: { id: quiz.id }, data: { expiresAt: null, closedAt: new Date() } });
  assert.equal((await call(join, laterStudent)).status, 409);
  await db.quiz.update({ where: { id: quiz.id }, data: { closedAt: null } });
  assert.equal((await call(attempt)).status, 404);
  const state = await call(attempt, undefined, first.cookie);
  assert.equal(state.status, 200);
  assert.equal(state.data.questions.length, 1);
  assert.ok(state.data.questions[0].options.every(option => !("correct" in option)));
  const question = quiz.questions[0];
  const correct = question.options.find(option => option.correct);
  const answer = { type: "ANSWER", questionId: question.id, optionId: correct.id };
  assert.equal((await call(attempt, answer, first.cookie)).status, 200);
  assert.equal((await call(attempt, undefined, first.cookie)).data.answers[question.id], correct.id);
  assert.equal((await call(attempt, { type: "BLUR" }, first.cookie)).data.status, "IN_PROGRESS");
  assert.equal((await call(attempt, { type: "TAB_SWITCH" }, first.cookie)).data.status, "TAB_SWITCH");
  assert.equal((await call(attempt, answer, first.cookie)).data.status, "TAB_SWITCH");
  assert.deepEqual((await call(attempt, undefined, first.cookie)).data.result, { score: 2, total: 2 });
  assert.equal((await call(join, student)).status, 409);

  await db.quiz.update({ where: { id: quiz.id }, data: { showResults: false } });
  assert.equal((await call(attempt, undefined, first.cookie)).data.result, null);
  await db.quiz.update({ where: { id: quiz.id }, data: { resultsReleasedAt: new Date() } });
  assert.deepEqual((await call(attempt, undefined, first.cookie)).data.result, { score: 2, total: 2 });

  const second = await call(join, { ...student, rollNumber: tag + "-deadline" });
  await db.quizAttempt.update({ where: { id: second.data.id }, data: { endsAt: new Date(Date.now() - 1000) } });
  const secondPath = "/api/attempt/" + second.data.id;
  assert.equal((await call(secondPath, answer, second.cookie)).data.status, "EXPIRED");
  assert.equal((await call(secondPath, undefined, second.cookie)).data.result.score, 0);

  const third = await call(join, { ...student, rollNumber: tag + "-fullscreen" });
  assert.equal((await call("/api/attempt/" + third.data.id, { type: "FULLSCREEN_EXIT" }, third.cookie)).data.status, "IN_PROGRESS");
  const fullscreenAttempt = await db.quizAttempt.findUniqueOrThrow({ where: { id: third.data.id } });
  const fullscreenOrder = JSON.parse(fullscreenAttempt.questionOrder);
  fullscreenOrder.fullscreenDeadline = Date.now() - 1;
  await db.quizAttempt.update({ where: { id: third.data.id }, data: { questionOrder: JSON.stringify(fullscreenOrder) } });
  assert.equal((await call("/api/attempt/" + third.data.id, { type: "TIME" }, third.cookie)).data.status, "FULLSCREEN_EXIT");
  const exportPath = "/api/admin/results?quiz=" + quiz.id + "&status=TAB_SWITCH";
  assert.equal((await fetch(origin + exportPath)).status, 401);
  const session = admin.id + "." + (Date.now() + 60000);
  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(session).digest("hex");
  const report = await fetch(origin + exportPath, { headers: { Cookie: "lecturer=" + session + "." + signature } });
  assert.equal(report.status, 200);
  const board = await fetch(origin + "/admin/quizzes/" + quiz.id + "/leaderboard", {
    headers: { Cookie: "lecturer=" + session + "." + signature },
  });
  assert.equal(board.status, 200);
  assert.match(await board.text(), /Scores have been released to students/);
  assert.match(report.headers.get("content-type"), /text\/csv/);
  const csv = await report.text();
  assert.ok(csv.includes(tag.toUpperCase()));
  assert.ok(!csv.includes(tag.toUpperCase() + "-FULLSCREEN"));
  console.log("Passed: ownership, duplicate protection, answer privacy and persistence, blur, termination, grading, deadline enforcement, scheduled opening and link expiration, manual closure, manual result visibility, leaderboard, and authenticated filtered CSV.");
} finally {
  if (quiz) {
    const attempts = { attempt: { quizId: quiz.id } };
    await db.studentAnswer.deleteMany({ where: attempts });
    await db.violation.deleteMany({ where: attempts });
    await db.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await db.quiz.delete({ where: { id: quiz.id } });
    await db.student.deleteMany({ where: { rollNumber: { startsWith: tag.toUpperCase() } } });
  }
  await db.admin.delete({ where: { id: admin.id } });
  await db.$disconnect();
}

