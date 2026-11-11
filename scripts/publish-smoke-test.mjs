import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const origin = process.env.QUIZ_TEST_ORIGIN ?? "http://127.0.0.1:3018";
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
const actionId = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === "saveQuiz")?.[0];
assert.ok(actionId, "Build the app before running the publishing smoke test.");
const tag = randomUUID();
const admin = await db.admin.create({ data: {
  email: tag + "@example.test", passwordHash: "test-fixture", verifiedAt: new Date(),
  subjects: { create: { name: "Publishing fixture", nameKey: "publishing fixture" } },
} });
const session = admin.id + "." + (Date.now() + 60000);
const signature = createHmac("sha256", process.env.SESSION_SECRET).update(session).digest("hex");
const cookie = "lecturer=" + session + "." + signature;

async function save(input, publish, authenticated = true) {
  console.log("Checking publish request:", publish ? "publish" : "draft", authenticated ? "authenticated" : "expired session");
  const response = await fetch(origin + "/admin/quizzes/create", {
    method: "POST",
    headers: { "Next-Action": actionId, Origin: origin, "Content-Type": "text/plain;charset=UTF-8",
      ...(authenticated ? { Cookie: cookie } : {}) },
    body: JSON.stringify([null, input, publish]), signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  try {
    while (true) {
      const { value: chunk, done } = await reader.read();
      body += decoder.decode(chunk ?? new Uint8Array(), { stream: !done });
      for (const line of body.split("\n")) {
        const object = line.match(/^[0-9a-f]+:(\{.*\})$/)?.[1];
        if (!object) continue;
        const value = JSON.parse(object);
        if ("error" in value || ("id" in value && "published" in value)) return value;
      }
      if (done) break;
    }
  } finally {
    await reader.cancel();
  }
  throw new Error("The server did not return an action result.");
}

try {
  const input = {
    title: "Publishing fixture", course: "Publishing fixture", semester: "3", description: "", instructions: "",
    durationMinutes: 15, totalMarks: 1, opensAt: null, expiresAt: null,
    randomQuestions: false, randomOptions: false, requireFullscreen: true, detectTabSwitch: true,
    terminateOnTabSwitch: true, autoSubmit: true, multipleAttempts: false, showResults: true,
    questions: [{ text: "Fixture question", options: ["A", "B", "C", "D"], correct: 0, marks: 1 }],
  };
  const broken = structuredClone(input);
  broken.questions[0].options[1] = "";
  const invalid = await save(broken, true);
  assert.equal(invalid.issues[0].path, "questions.0.options.1");
  assert.equal(invalid.issues[0].label, "Question 1 · Option B");
  assert.equal(await db.quiz.count({ where: { adminId: admin.id } }), 0);
  const mismatch = await save({ ...input, totalMarks: 20 }, true);
  assert.ok(mismatch.issues.some(issue => issue.path === "totalMarks"));
  const published = await save(input, true);
  assert.equal(published.published, true);
  const saved = await db.quiz.findUniqueOrThrow({ where: { id: published.id } });
  assert.equal(saved.totalMarks, 1);
  const mixed = await save({ ...input, title: "Mixed publishing fixture", totalMarks: 3, questions: [
    { ...input.questions[0], type: "MCQ" },
    { text: "Blank fixture", type: "BLANK", acceptedAnswers: ["OS"], options: [], correct: 0, marks: 1 },
    { text: "Theory fixture", type: "THEORY", acceptedAnswers: [], options: [], correct: 0, marks: 1 },
  ] }, true);
  assert.equal(mixed.published, true);
  const savedMixed = await db.question.findMany({ where: { quizId: mixed.id }, orderBy: { position: "asc" }, include: { options: true } });
  assert.deepEqual(savedMixed.map(question => question.type), ["MCQ", "BLANK", "THEORY"]);
  assert.equal(savedMixed[1].options.length, 0);
  assert.deepEqual(JSON.parse(savedMixed[1].acceptedAnswers), ["OS"]);
  await db.admin.update({ where: { id: admin.id }, data: { canPublishQuizzes: false } });
  assert.match((await save(input, true)).error, /Publishing is disabled/);
  const draft = await save({ ...input, questions: [] }, false);
  assert.equal(draft.published, false);
  assert.match((await save(input, true, false)).error, /session has expired/);
  console.log("Passed: server field errors, marks mismatch, successful MCQ/mixed publishing, permissions, draft saving, and expired session feedback.");
} finally {
  await db.quiz.deleteMany({ where: { adminId: admin.id } });
  await db.admin.delete({ where: { id: admin.id } });
  await db.$disconnect();
}
