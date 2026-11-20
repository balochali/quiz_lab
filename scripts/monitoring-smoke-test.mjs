import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
assert.equal(process.env.DATABASE_URL, "file:./dev.db");
const db = new PrismaClient(); const tag = randomUUID(); const origin = "http://127.0.0.1:3018";
let admin, quiz, studentId;
try {
  admin = await db.admin.create({ data: { email: tag + "@example.test", passwordHash: "fixture", verifiedAt: new Date() } });
  quiz = await db.quiz.create({ data: { adminId: admin.id, title: "Monitoring fixture", course: "Test", semester: "3", description: "", instructions: "", durationMinutes: 10, totalMarks: 1, published: true, detectTabSwitch: true, terminateOnTabSwitch: false, questions: { create: { text: "Test", marks: 1, position: 0, options: { create: { text: "Yes", correct: true, position: 0 } } } } }, include: { questions: true } });
  const joined = await fetch(origin + "/api/join/" + quiz.code, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Monitoring student", rollNumber: tag, semester: "3" }) });
  assert.equal(joined.status, 200); const { id } = await joined.json(); const cookie = joined.headers.get("set-cookie").split(";")[0];
  studentId = (await db.quizAttempt.findUniqueOrThrow({ where: { id } })).studentId;
  const context = { questionId: quiz.questions[0].id, visibility: "visible", hasFocus: false, fullscreen: true, destination: "must-not-be-stored" };
  async function send(type, observed = context) { const response = await fetch(origin + "/api/attempt/" + id, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ type, context: observed }) }); assert.equal(response.status, 200); return response.json(); }
  await send("BLUR"); await send("FOCUS", { ...context, hasFocus: true });
  await send("TAB_SWITCH", { ...context, visibility: "hidden" }); await send("VISIBLE");
  await send("FULLSCREEN_EXIT", { ...context, fullscreen: false }); await send("FULLSCREEN_RESTORED");
  const logs = await db.violation.findMany({ where: { attemptId: id }, orderBy: { createdAt: "asc" } });
  assert.equal(logs.length, 6);
  for (const event of logs) { const details = JSON.parse(event.details); assert.equal(details.questionNumber, 1); assert.equal(details.destination, undefined); }
  await db.violation.create({ data: { attemptId: id, type: "BLUR" } });
  await send("SUBMIT");
  const token = admin.id + "." + (Date.now() + 60000); const signature = createHmac("sha256", process.env.SESSION_SECRET).update(token).digest("hex");
  const response = await fetch(origin + "/admin/results/" + id, { headers: { Cookie: "lecturer=" + token + "." + signature } });
  assert.equal(response.status, 200); const html = await response.text();
  assert.ok(html.includes("Monitoring timeline")); assert.ok(html.includes("PKT")); assert.ok(html.includes("cannot be reconstructed")); assert.ok(html.includes("Focus returned to the quiz"));
  assert.equal((await db.quizAttempt.findUniqueOrThrow({ where: { id } })).status, "SUBMITTED");
  console.log("Passed: focus/visibility/fullscreen context and recovery events, question mapping, removal of unsupported destination data, legacy records, PKT report, and unchanged submission behavior.");
} finally {
  if (quiz) { await db.studentAnswer.deleteMany({ where: { attempt: { quizId: quiz.id } } }); await db.violation.deleteMany({ where: { attempt: { quizId: quiz.id } } }); await db.quizAttempt.deleteMany({ where: { quizId: quiz.id } }); await db.quiz.delete({ where: { id: quiz.id } }); }
  if (studentId) await db.student.delete({ where: { id: studentId } });
  if (admin) await db.admin.delete({ where: { id: admin.id } }); await db.$disconnect();
}
