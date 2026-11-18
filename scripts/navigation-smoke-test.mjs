import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
assert.equal(process.env.DATABASE_URL, "file:./dev.db");
const db = new PrismaClient(); const tag = randomUUID(); let admin;
const quizIds = [], studentIds = [];
try {
  admin = await db.admin.create({ data: { email: tag + "@example.test", passwordHash: "fixture", verifiedAt: new Date() } });
  for (const nextOnly of [true, false]) for (const timed of [true, false]) {
    const quiz = await db.quiz.create({ data: { adminId: admin.id, title: "Navigation test", course: "Test", semester: "3", description: "", instructions: "", durationMinutes: 10, totalMarks: 3, published: true, nextOnly, questions: { create: Array.from({ length: 3 }, (_, position) => ({ text: "Question " + position, marks: 1, durationSeconds: timed ? 60 : null, position, options: { create: { text: "Yes", correct: true, position: 0 } } })) } }, include: { questions: { orderBy: { position: "asc" }, include: { options: true } } } });
    quizIds.push(quiz.id);
    const joined = await fetch("http://127.0.0.1:3018/api/join/" + quiz.code, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Navigation fixture", semester: "3", rollNumber: randomUUID() }) });
    assert.equal(joined.status, 200); const { id } = await joined.json(); const cookie = joined.headers.get("set-cookie").split(";")[0];
    studentIds.push((await db.quizAttempt.findUniqueOrThrow({ where: { id } })).studentId);
    async function call(body) { const response = await fetch("http://127.0.0.1:3018/api/attempt/" + id, { method: body ? "POST" : "GET", headers: { Cookie: cookie, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, value: await response.json() }; }
    const [first, second, last] = quiz.questions;
    const open = question => ({ type: "QUESTION_OPEN", questionId: question.id });
    assert.equal((await call()).value.policy.nextOnly, nextOnly);
    assert.equal((await call(open(first))).status, 200);
    assert.equal((await call(open(last))).status, nextOnly ? 400 : 200);
    assert.equal((await call(open(second))).status, 200);
    assert.equal((await call()).value.navigationPosition, nextOnly ? 1 : 0);
    assert.equal((await call(open(first))).status, nextOnly ? 400 : 200);
    assert.equal((await call({ type: "ANSWER", questionId: first.id, optionId: first.options[0].id })).status, nextOnly ? 400 : 200);
    assert.equal((await call(open(last))).status, 200);
  }
  console.log("Passed: timed/untimed free navigation, next-only skip/back protection, old-answer protection, and resume position.");
} finally {
  const where = { attempt: { quizId: { in: quizIds } } };
  await db.studentAnswer.deleteMany({ where }); await db.violation.deleteMany({ where });
  await db.quizAttempt.deleteMany({ where: { quizId: { in: quizIds } } }); await db.quiz.deleteMany({ where: { id: { in: quizIds } } });
  await db.student.deleteMany({ where: { id: { in: studentIds } } });
  if (admin) await db.admin.delete({ where: { id: admin.id } }); await db.$disconnect();
}
