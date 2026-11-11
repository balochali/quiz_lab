import assert from "node:assert/strict";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const origin = process.env.QUIZ_TEST_ORIGIN ?? "http://127.0.0.1:3018";
const tag = randomUUID();
const email = tag + "@example.test";
const otherEmail = "other-" + email;
let message = "";
const smtp = createServer(socket => {
  let buffer = "";
  let receiving = false;
  socket.setEncoding("utf8");
  socket.write("220 QuizLab test SMTP\r\n");
  socket.on("data", data => {
    buffer += data;
    let end;
    while ((end = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (receiving) {
        if (line === ".") {
          receiving = false;
          socket.write("250 queued\r\n");
        } else message += line + "\r\n";
      } else if (/^DATA$/i.test(line)) {
        receiving = true;
        message = "";
        socket.write("354 End with a dot\r\n");
      } else if (/^QUIT$/i.test(line)) {
        socket.end("221 bye\r\n");
      } else socket.write("250 OK\r\n");
    }
  });
  socket.on("error", () => {});
});

function unescapeHtml(value) {
  const entities = { "&amp;": "&", "&quot;": '"', "&#x27;": "'", "&lt;": "<", "&gt;": ">" };
  return value.replace(/&(?:amp|quot|lt|gt|#x27);/g, entity => entities[entity]);
}

async function submit(path, button, values, cookie) {
  console.log("Checking form:", button);
  const headers = cookie ? { Cookie: cookie } : {};
  const page = await fetch(origin + path, { headers });
  assert.equal(page.status, 200, path);
  const html = await page.text();
  const form = [...html.matchAll(/<form\b[^>]*>(?:(?!<\/form>)[\s\S])*<\/form>/g)]
    .find(match => match[0].includes(">" + button + "</button>"))?.[0];
  assert.ok(form, "Missing form for " + button);
  const body = new FormData();
  for (const [input] of form.matchAll(/<input\b[^>]*>/g)) {
    const name = input.match(/\bname="([^"]+)"/)?.[1];
    const value = input.match(/\bvalue="([^"]*)"/)?.[1] ?? "";
    if (name?.startsWith("$ACTION_")) body.append(name, unescapeHtml(value));
  }
  assert.ok([...body.keys()].length, "Missing server action fields");
  for (const [key, value] of Object.entries(values)) body.set(key, value);
  return fetch(origin + path, { method: "POST", headers: { ...headers, Origin: origin }, body, redirect: "manual", signal: AbortSignal.timeout(60000) });
}

await new Promise((resolve, reject) => {
  smtp.once("error", reject);
  smtp.listen(2528, "127.0.0.1", resolve);
});
let quiz;
try {
  const signup = await submit("/admin/signup", "Send confirmation email", { email });
  await signup.text();
  const pending = await db.admin.findUniqueOrThrow({ where: { email } });
  assert.equal(pending.verifiedAt, null);
  assert.equal(pending.passwordHash, "");
  const raw = message.replace(/=\r\n/g, "").replace(/=3D/g, "=");
  const url = raw.match(/https?:\/\/[^\s]+\/admin\/verify\?token=[a-f0-9]{64}/)?.[0];
  assert.ok(url, "SMTP server did not receive a confirmation URL");
  const path = new URL(url).pathname + new URL(url).search;
  const password = tag + "-password";
  const verified = await submit(path, "Confirm email and create account", { password, confirmPassword: password });
  assert.equal(verified.status, 303);
  const cookie = verified.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("lecturer="));
  const account = await db.admin.findUniqueOrThrow({ where: { email } });
  assert.ok(account.verifiedAt);
  assert.equal(account.verificationHash, null);
  const reuse = await fetch(origin + path);
  assert.match(await reuse.text(), /expired, or already used/);

  const other = await db.admin.create({ data: {
    email: otherEmail, passwordHash: "test-fixture", verifiedAt: new Date(),
    subjects: { create: { name: "Other private subject", nameKey: "other private subject" } },
  } });
  const subjectPage = await fetch(origin + "/admin/subjects", { headers: { Cookie: cookie } });
  assert.doesNotMatch(await subjectPage.text(), /Other private subject/);
  const subject = "Test subject " + tag;
  const added = await submit("/admin/subjects", "Add subject", { name: subject }, cookie);
  assert.equal(added.status, 303);
  assert.equal(await db.subject.count({ where: { adminId: account.id, name: subject } }), 1);

  quiz = await db.quiz.create({ data: {
    adminId: account.id, title: "Deletion fixture", course: subject, semester: "1", description: "",
    instructions: "", durationMinutes: 10, totalMarks: 7, published: true, closedAt: new Date(),
    questions: { create: { text: "Fixture question", position: 0, marks: 7,
      options: { create: { text: "Fixture answer", position: 0, correct: true } } } },
  }, include: { questions: { include: { options: true } } } });
  const q = quiz.questions[0];
  const attempt = await db.quizAttempt.create({ data: {
    quiz: { connect: { id: quiz.id } }, student: { create: { name: "Fixture student", rollNumber: tag, semester: "1" } },
    tokenHash: tag, studentName: "Fixture student", rollNumber: tag, semester: "1", quizTitle: quiz.title,
    totalMarks: 7, questionOrder: "[]", endsAt: new Date(Date.now() + 60000),
    answers: { create: { questionId: q.id, optionId: q.options[0].id } },
    violations: { create: { type: "BLUR" } },
  } });
  const foreignQuiz = await db.quiz.create({ data: {
    adminId: other.id, title: "Foreign quiz", course: "Other private subject", semester: "1",
    description: "", instructions: "", durationMinutes: 10, totalMarks: 1,
  } });
  const foreignDeletion = await fetch(origin + "/admin/quizzes/" + foreignQuiz.id + "/delete", {
    headers: { Cookie: cookie },
  });
  const foreignHtml = await foreignDeletion.text();
  // Next.js can stream a not-found page after the 200 response headers are sent.
  assert.match(foreignHtml, /Page unavailable/);
  assert.doesNotMatch(foreignHtml, /Foreign quiz|Delete permanently/);
  const editPath = "/admin/quizzes/" + quiz.id + "/edit";
  const correction = { questionId: q.id, marks: "1", expectedMarks: "7", confirmed: "on" };
  const blocked = await submit(editPath, "Correct marks and regrade", correction, cookie);
  await blocked.text();
  assert.equal((await db.question.findUniqueOrThrow({ where: { id: q.id } })).marks, 7);
  await db.quizAttempt.update({ where: { id: attempt.id }, data: {
    status: "SUBMITTED", submittedAt: new Date(), obtainedMarks: 7,
  } });
  const corrected = await submit(editPath, "Correct marks and regrade", correction, cookie);
  await corrected.text();
  assert.equal((await db.question.findUniqueOrThrow({ where: { id: q.id } })).marks, 1);
  assert.equal((await db.quiz.findUniqueOrThrow({ where: { id: quiz.id } })).totalMarks, 1);
  const regraded = await db.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  assert.equal(regraded.obtainedMarks, 1);
  assert.equal(regraded.totalMarks, 1);
  assert.equal(regraded.status, "SUBMITTED");
  const deleted = await submit("/admin/quizzes/" + quiz.id + "/delete", "Delete permanently", {}, cookie);
  assert.equal(deleted.status, 303);
  assert.equal(await db.quiz.findUnique({ where: { id: quiz.id } }), null);
  assert.equal(await db.quizAttempt.findUnique({ where: { id: attempt.id } }), null);
  assert.equal(await db.studentAnswer.count({ where: { attemptId: attempt.id } }), 0);
  assert.equal(await db.violation.count({ where: { attemptId: attempt.id } }), 0);
  assert.equal((await fetch(origin + "/join/" + quiz.code)).status, 404);
  console.log("Passed: SMTP signup, one-time verification, subject isolation, and post-submission regrading, active-attempt protection, and confirmed quiz deletion with attempts.");
} finally {
  if (quiz) {
    await db.studentAnswer.deleteMany({ where: { attempt: { quizId: quiz.id } } });
    await db.violation.deleteMany({ where: { attempt: { quizId: quiz.id } } });
    await db.quizAttempt.deleteMany({ where: { quizId: quiz.id } });
  }
  const testEmails = [email, otherEmail];
  await db.quiz.deleteMany({ where: { admin: { email: { in: testEmails } } } });
  await db.student.deleteMany({ where: { rollNumber: tag } });
  await db.admin.deleteMany({ where: { email: { in: testEmails } } });
  await db.$disconnect();
  await new Promise(resolve => smtp.close(resolve));
}
