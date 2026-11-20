import assert from "node:assert/strict";
import { randomUUID, createHmac, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
assert.equal(process.env.DATABASE_URL, "file:./dev.db");
const db = new PrismaClient(); const origin = "http://127.0.0.1:3018"; const tag = randomUUID();
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
const action = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === "adjustAttemptMarks")?.[0];
assert.ok(action, "Build before testing adjustments.");
let admin, foreign, quiz; const students = [];
function cookie(account) { const value = account.id + "." + (Date.now() + 300000); return "lecturer=" + value + "." + createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("hex"); }
async function adjust(input, actor = admin) {
  const response = await fetch(origin + "/admin/results", { method: "POST", headers: { "Next-Action": action, Origin: origin, "Content-Type": "text/plain;charset=UTF-8", ...(actor ? { Cookie: cookie(actor) } : {}) }, body: JSON.stringify([input]), signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let body = "";
  try { while (true) { const { value, done } = await reader.read(); body += decoder.decode(value ?? new Uint8Array(), { stream: !done }); for (const line of body.split("\n")) { const text = line.match(/^[0-9a-f]+:(\{.*\})$/)?.[1]; if (text) { const result = JSON.parse(text); if ("error" in result || "success" in result) return result; } } if (done) break; } }
  finally { await reader.cancel(); }
  throw new Error("Missing adjustment action response");
}
try {
  admin = await db.admin.create({ data: { email: tag + "@example.test", passwordHash: "fixture", verifiedAt: new Date() } });
  foreign = await db.admin.create({ data: { email: tag + "-foreign@example.test", passwordHash: "fixture", verifiedAt: new Date() } });
  quiz = await db.quiz.create({ data: { adminId: admin.id, title: "Adjustment fixture", course: "Test", semester: "3", description: "", instructions: "", durationMinutes: 10, totalMarks: 10, published: true, showResults: true } });
  const token = randomUUID();
  async function attempt(name, score, secret) {
    const student = await db.student.create({ data: { name, rollNumber: randomUUID(), semester: "3" } }); students.push(student.id);
    return db.quizAttempt.create({ data: { quizId: quiz.id, studentId: student.id, studentName: name, rollNumber: student.rollNumber, semester: "3", quizTitle: quiz.title, totalMarks: 10, obtainedMarks: score, status: "SUBMITTED", submittedAt: new Date(), endsAt: new Date(), tokenHash: createHash("sha256").update(secret).digest("hex"), questionOrder: "{}" } });
  }
  const a = await attempt("Adjusted student", 7, token); await attempt("Other student", 8, randomUUID());
  const input = { attemptId: a.id, marks: 9, reason: "Two grace marks", expectedAdjusted: null, expectedOriginal: 7, expectedTotal: 10 };
  assert.match((await adjust(input, null)).error, /session/);
  assert.match((await adjust(input, foreign)).error, /not found/);
  await db.admin.update({ where: { id: admin.id }, data: { canCorrectMarks: false } });
  assert.match((await adjust(input)).error, /disabled/);
  await db.admin.update({ where: { id: admin.id }, data: { canCorrectMarks: true } });
  assert.match((await adjust({ ...input, marks: 11 })).error, /between 0 and 10/);
  assert.ok((await adjust({ ...input, reason: "" })).error);
  await db.quizAttempt.update({ where: { id: a.id }, data: { gradingPending: true } });
  assert.match((await adjust(input)).error, /written-answer grading/);
  await db.quizAttempt.update({ where: { id: a.id }, data: { gradingPending: false, status: "IN_PROGRESS", submittedAt: null } });
  assert.match((await adjust(input)).error, /ended/);
  await db.quizAttempt.update({ where: { id: a.id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
  assert.equal((await adjust(input)).success, true);
  let saved = await db.quizAttempt.findUniqueOrThrow({ where: { id: a.id } });
  assert.equal(saved.obtainedMarks, 7); assert.equal(saved.adjustedMarks, 9); assert.equal(JSON.parse(saved.markAdjustments)[0].actorId, admin.id);
  assert.match((await adjust({ ...input, marks: 8 })).error, /changed/);
  async function state() { return (await fetch(origin + "/api/attempt/" + a.id, { headers: { Cookie: "attempt_" + a.id + "=" + token } })).json(); }
  assert.deepEqual((await state()).result, { score: 9, total: 10 });
  const board = await (await fetch(origin + "/admin/quizzes/" + quiz.id + "/leaderboard", { headers: { Cookie: cookie(admin) } })).text();
  assert.ok(board.indexOf("Adjusted student") < board.indexOf("Other student"));
  await db.quiz.update({ where: { id: quiz.id }, data: { showResults: false } });
  assert.equal((await state()).result, null);
  await db.quiz.update({ where: { id: quiz.id }, data: { resultsReleasedAt: new Date() } });
  assert.equal((await state()).result.score, 9);
  assert.equal((await adjust({ ...input, marks: 4, expectedAdjusted: 9, reason: "Violation reviewed; deduct marks" })).success, true);
  const exported = await fetch(origin + "/api/admin/results/excel?quiz=" + quiz.id, { headers: { Cookie: cookie(admin) } });
  assert.equal(exported.status, 200); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await exported.arrayBuffer()));
  const sheet = workbook.worksheets[0]; let row;
  sheet.eachRow(candidate => { if (candidate.getCell(1).value === "Adjusted student") row = candidate; });
  assert.ok(row); assert.equal(row.getCell(5).value, 7); assert.equal(row.getCell(11).value, 4); assert.equal(row.getCell(7).value, .4); assert.match(row.getCell(12).value, /Violation reviewed/);
  assert.equal((await adjust({ ...input, marks: 0, expectedAdjusted: 4, reason: "Deduction to zero" })).success, true);
  assert.equal((await state()).result.score, 0);
  assert.equal((await adjust({ ...input, marks: null, expectedAdjusted: 0, reason: "Restore original grade" })).success, true);
  saved = await db.quizAttempt.findUniqueOrThrow({ where: { id: a.id } });
  assert.equal(saved.adjustedMarks, null); assert.equal(saved.obtainedMarks, 7); assert.equal(JSON.parse(saved.markAdjustments).length, 4);
  assert.equal((await state()).result.score, 7);
  console.log("Passed: authenticated/owned/permission-checked adjustments, bounds, pending/active guards, original preservation, audit history, concurrent edit protection, student release privacy, leaderboard order, Excel final grades, zero marks, and reset.");
} finally {
  if (quiz) { await db.quizAttempt.deleteMany({ where: { quizId: quiz.id } }); await db.quiz.delete({ where: { id: quiz.id } }); }
  await db.student.deleteMany({ where: { id: { in: students } } });
  if (admin) await db.admin.delete({ where: { id: admin.id } }); if (foreign) await db.admin.delete({ where: { id: foreign.id } }); await db.$disconnect();
}
