import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
assert.equal(process.env.DATABASE_URL, "file:./dev.db");
const db = new PrismaClient(); const tag = randomUUID(); const origin = "http://127.0.0.1:3018";
let admin, foreign, quiz, foreignQuiz, student;
function cookie(id) { const value = id + "." + (Date.now() + 300000); return "lecturer=" + value + "." + createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("hex"); }
async function request(path, account = admin) { return fetch(origin + path, { headers: account ? { Cookie: cookie(account.id) } : {}, signal: AbortSignal.timeout(20000) }); }
try {
  admin = await db.admin.create({ data: { email: tag + "@example.test", passwordHash: "fixture", verifiedAt: new Date(), subjects: { create: { name: "Result subject " + tag, nameKey: tag } } } });
  foreign = await db.admin.create({ data: { email: tag + "-foreign@example.test", passwordHash: "fixture", verifiedAt: new Date() } });
  const fields = { title: "Results fixture " + tag, course: "Result subject " + tag, semester: "3", description: "", instructions: "", durationMinutes: 10, totalMarks: 10, published: true };
  quiz = await db.quiz.create({ data: { ...fields, adminId: admin.id } });
  foreignQuiz = await db.quiz.create({ data: { ...fields, title: "FOREIGN_QUIZ_MARKER", adminId: foreign.id } });
  student = await db.student.create({ data: { name: "Results student", rollNumber: tag, semester: "3" } });
  await db.quizAttempt.create({ data: { quizId: quiz.id, studentId: student.id, studentName: "=NotAFormula", rollNumber: "00123", semester: "3", quizTitle: quiz.title, totalMarks: 10, obtainedMarks: 7, status: "SUBMITTED", submittedAt: new Date(), endsAt: new Date(), tokenHash: tag, questionOrder: "{}" } });
  const page = await request("/admin/results?quiz=" + quiz.id); assert.equal(page.status, 200); const html = await page.text();
  assert.ok(html.includes("All subjects")); assert.ok(html.includes("Export to Excel"));
  assert.ok(html.includes(quiz.title)); assert.ok(!html.includes("FOREIGN_QUIZ_MARKER"));
  assert.ok(!html.includes("Apply filters")); assert.ok(!html.includes("Export CSV"));
  const path = "/api/admin/results/excel?quiz=" + quiz.id;
  const exported = await request(path); assert.equal(exported.status, 200);
  assert.match(exported.headers.get("content-type"), /spreadsheetml/);
  assert.match(exported.headers.get("content-disposition"), /\.xlsx/);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await exported.arrayBuffer()));
  assert.equal(workbook.worksheets[0].getCell("A2").value, "=NotAFormula");
  assert.equal(workbook.worksheets[0].getCell("E2").value, 7);
  assert.equal((await request(path, null)).status, 401);
  assert.equal((await request("/api/admin/results/excel?quiz=" + foreignQuiz.id)).status, 404);
  assert.equal((await request("/api/admin/results/excel")).status, 400);
  await db.admin.update({ where: { id: admin.id }, data: { canExportResults: false } });
  assert.equal((await request(path)).status, 403);
  console.log("Passed: subject tabs and per-quiz results, removal of filter form/global CSV, real Excel download, lecturer isolation, authentication, export permissions, and missing-quiz validation.");
} finally {
  if (quiz) { await db.quizAttempt.deleteMany({ where: { quizId: quiz.id } }); await db.quiz.delete({ where: { id: quiz.id } }); }
  if (foreignQuiz) await db.quiz.delete({ where: { id: foreignQuiz.id } });
  if (student) await db.student.delete({ where: { id: student.id } });
  if (admin) await db.admin.delete({ where: { id: admin.id } });
  if (foreign) await db.admin.delete({ where: { id: foreign.id } });
  await db.$disconnect();
}
