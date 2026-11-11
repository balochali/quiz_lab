import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";

const root = resolve("scripts");
const directory = mkdtempSync(join(root, ".migration-preservation-"));
const database = new DatabaseSync(join(directory, "legacy.db"));
try {
  database.exec("PRAGMA foreign_keys=ON");
  const migrationRoot = "prisma/migrations";
  for (const name of readdirSync(migrationRoot).filter(name => /^000[1-5]_/.test(name)).sort()) {
    database.exec(readFileSync(join(migrationRoot, name, "migration.sql"), "utf8"));
  }
  database.prepare('INSERT INTO "Admin" ("id","email","passwordHash","verifiedAt") VALUES (?,?,?,?)')
    .run("legacy-admin", "legacy@example.test", "fixture-hash", "2026-11-10T12:00:00Z");
  database.prepare('INSERT INTO "Quiz" ("id","code","adminId","title","course","description","semester","instructions","durationMinutes","totalMarks","published") VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run("legacy-quiz", "legacy-code", "legacy-admin", "Existing Computer Networks Quiz", "Computer Networks", "Existing description", "3", "Existing instructions", 60, 14, 1);
  for (let index = 0; index < 14; index++) {
    database.prepare('INSERT INTO "Question" ("id","quizId","text","position","marks") VALUES (?,?,?,?,?)')
      .run("question-" + index, "legacy-quiz", "Existing question " + index, index, 1);
    for (let option = 0; option < 4; option++) {
      database.prepare('INSERT INTO "Option" ("id","questionId","text","position","correct") VALUES (?,?,?,?,?)')
        .run("option-" + index + "-" + option, "question-" + index, "Option " + option, option, option === 0 ? 1 : 0);
    }
  }
  for (const [studentIndex, score] of [[1, 14], [2, 3]]) {
    database.prepare('INSERT INTO "Student" ("id","rollNumber","name","semester") VALUES (?,?,?,?)')
      .run("student-" + studentIndex, "LEGACY-" + studentIndex, "Existing student " + studentIndex, "3");
    database.prepare('INSERT INTO "QuizAttempt" ("id","quizId","studentId","tokenHash","studentName","rollNumber","semester","quizTitle","totalMarks","obtainedMarks","status","questionOrder","startedAt","endsAt","submittedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run("attempt-" + studentIndex, "legacy-quiz", "student-" + studentIndex, "token-" + studentIndex,
        "Existing student " + studentIndex, "LEGACY-" + studentIndex, "3", "Existing Computer Networks Quiz", 14, score, "SUBMITTED",
        JSON.stringify({ order: Array.from({ length: 14 }, (_, i) => "question-" + i) }),
        "2026-11-11T05:00:00Z", "2026-11-11T06:00:00Z", "2026-11-11T05:19:00Z");
    for (let index = 0; index < 14; index++) {
      database.prepare('INSERT INTO "StudentAnswer" ("id","attemptId","questionId","optionId","updatedAt") VALUES (?,?,?,?,?)')
        .run("answer-" + studentIndex + "-" + index, "attempt-" + studentIndex, "question-" + index,
          "option-" + index + "-" + (index < score ? 0 : 1), "2026-11-11T05:18:00Z");
    }
    database.prepare('INSERT INTO "Violation" ("id","attemptId","type","createdAt") VALUES (?,?,?,?)')
      .run("event-" + studentIndex, "attempt-" + studentIndex, "BLUR", "2026-11-11T05:10:00Z");
  }
  const tables = ["Admin", "Subject", "Quiz", "Question", "Option", "Student", "QuizAttempt", "StudentAnswer", "Violation"];
  const before = new Map(tables.map(table => [table, database.prepare('SELECT * FROM "' + table + '" ORDER BY id').all()]));
  database.exec(readFileSync("prisma/migrations/0006_question_formats/migration.sql", "utf8"));
  for (const table of tables) {
    const prior = before.get(table);
    const after = database.prepare('SELECT * FROM "' + table + '" ORDER BY id').all();
    assert.equal(after.length, prior.length, table + " record count");
    for (let index = 0; index < prior.length; index++) {
      for (const [field, value] of Object.entries(prior[index])) {
        assert.deepEqual(after[index][field], value, table + "." + field);
      }
    }
  }
  assert.deepEqual(database.prepare('SELECT obtainedMarks,totalMarks,status,gradingPending FROM "QuizAttempt" ORDER BY id').all()
    .map(row => [row.obtainedMarks, row.totalMarks, row.status, row.gradingPending]),
    [[14, 14, "SUBMITTED", 0], [3, 14, "SUBMITTED", 0]]);
  assert.ok(database.prepare('SELECT type FROM "Question"').all().every(row => row.type === "MCQ"));
  assert.equal(database.prepare("PRAGMA foreign_key_check").all().length, 0);

  const productionSql = readFileSync("prisma/postgresql/migrations/0003_question_formats/migration.sql", "utf8");
  for (const statement of productionSql.split(";").map(value => value.trim()).filter(Boolean)) {
    assert.match(statement, /^ALTER TABLE "(Question|QuizAttempt|StudentAnswer)" (ADD COLUMN |ALTER COLUMN "optionId" DROP NOT NULL$)/);
  }
  console.log("Passed: old quizzes, all question/option IDs, 28 saved answers, stored 14/14 and 3/14 grades, statuses, timestamps, accounts, students, and monitoring events preserved. Production migration contains only additive/nullable column changes.");
} finally {
  database.close();
  if (!directory.startsWith(root + sep)) throw new Error("Unexpected test directory");
  rmSync(directory, { recursive: true, force: true });
}
