import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const origin = process.env.QUIZ_TEST_ORIGIN ?? "http://127.0.0.1:3018";
const tag = randomUUID();
const admin = await db.admin.create({ data: { email: tag + "@example.test", passwordHash: "test-fixture", verifiedAt: new Date() } });
const session = admin.id + "." + (Date.now() + 60000);
const signature = createHmac("sha256", process.env.SESSION_SECRET).update(session).digest("hex");
const adminCookie = "lecturer=" + session + "." + signature;
let quiz;

async function call(path, body, cookie) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, value: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
function decode(value) {
  return value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}
async function grade(path, marks) {
  const page = await fetch(origin + path, { headers: { Cookie: adminCookie } });
  const html = await page.text();
  const form = [...html.matchAll(/<form\b[^>]*>(?:(?!<\/form>)[\s\S])*<\/form>/g)]
    .find(match => /(?:Grade answer|Update grading)<\/button>/.test(match[0]))?.[0];
  assert.ok(form, "Written-answer grading form was not rendered.");
  const body = new FormData();
  for (const [input] of form.matchAll(/<input\b[^>]*>/g)) {
    const name = input.match(/\bname="([^"]+)"/)?.[1];
    if (name) body.set(name, decode(input.match(/\bvalue="([^"]*)"/)?.[1] ?? ""));
  }
  body.set("marks", String(marks));
  const result = await fetch(origin + path, { method: "POST", headers: { Cookie: adminCookie, Origin: origin }, body, redirect: "manual" });
  assert.equal(result.status, 303);
}
try {
  quiz = await db.quiz.create({ data: {
    adminId: admin.id, title: "Mixed-format fixture", course: "Test subject", description: "", instructions: "", semester: "1",
    durationMinutes: 10, totalMarks: 10, published: true,
    questions: { create: [
      { text: "Pick one", type: "MCQ", marks: 5, position: 0, options: { create: ["A", "B", "C", "D"].map((text, position) => ({ text, position, correct: position === 1 })) } },
      { text: "Complete the term", type: "BLANK", marks: 2, position: 1, acceptedAnswers: JSON.stringify(["operating system", "OS"]) },
      { text: "Explain your answer", type: "THEORY", marks: 3, position: 2 },
    ] },
  }, include: { questions: { orderBy: { position: "asc" }, include: { options: true } } } });
  const [mcq, blank, theory] = quiz.questions;
  const joined = await call("/api/join/" + quiz.code, { name: "Mixed student", rollNumber: tag, semester: "1" });
  assert.equal(joined.response.status, 200);
  const id = joined.value.id;
  const path = "/api/attempt/" + id;
  const cookie = joined.cookie;
  const state = (await call(path, undefined, cookie)).value;
  assert.deepEqual(state.questions.map(q => q.type), ["MCQ", "BLANK", "THEORY"]);
  assert.ok(state.questions.every(q => !("acceptedAnswers" in q) && q.options.every(option => !("correct" in option))));
  await call(path, { type: "ANSWER", questionId: mcq.id, optionId: mcq.options.find(option => option.correct).id }, cookie);
  await call(path, { type: "ANSWER", questionId: blank.id, textAnswer: "  Operating   System " }, cookie);
  await call(path, { type: "ANSWER", questionId: theory.id, textAnswer: "A written explanation.", awardedMarks: 3 }, cookie);
  assert.equal((await call(path, undefined, cookie)).value.answers[theory.id], "A written explanation.");
  await call(path, { type: "SUBMIT" }, cookie);
  const pending = (await call(path, undefined, cookie)).value;
  assert.equal(pending.gradingPending, true);
  assert.equal(pending.result, null);
  let attempt = await db.quizAttempt.findUniqueOrThrow({ where: { id } });
  assert.equal(attempt.obtainedMarks, 7);
  const forbidden = await call(path, { type: "ANSWER", questionId: theory.id, textAnswer: "Edited later" }, cookie);
  assert.equal(forbidden.value.status, "SUBMITTED");
  const detail = "/admin/results/" + id;
  await grade(detail, 4);
  attempt = await db.quizAttempt.findUniqueOrThrow({ where: { id } });
  assert.equal(attempt.gradingPending, true);
  assert.equal(attempt.obtainedMarks, 7);
  await grade(detail, 3);
  const graded = (await call(path, undefined, cookie)).value;
  assert.equal(graded.gradingPending, false);
  assert.deepEqual(graded.result, { score: 10, total: 10 });
  console.log("Passed: mixed formats, private answer keys, text autosave API, normalized blank grading, theory review, grade limits, result gating, and final scoring.");
} finally {
  if (quiz) {
    await db.studentAnswer.deleteMany({ where: { attempt: { quizId: quiz.id } } });
    await db.violation.deleteMany({ where: { attempt: { quizId: quiz.id } } });
    await db.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
    await db.quiz.delete({ where: { id: quiz.id } });
  }
  await db.student.deleteMany({ where: { rollNumber: tag.toUpperCase() } });
  await db.admin.delete({ where: { id: admin.id } });
  await db.$disconnect();
}
