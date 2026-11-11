import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Compile the shared validators in isolation without needing a server or database.
const directory = mkdtempSync(resolve("scripts/.quiz-validation-"));
try {
  for (const name of ["quiz-schema", "quiz-validation"]) {
    const source = readFileSync("src/lib/" + name + ".ts", "utf8").replace('"./quiz-schema"', '"./quiz-schema.mjs"');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
    writeFileSync(join(directory, name + ".mjs"), outputText);
  }
  const { getQuizIssues } = await import(pathToFileURL(join(directory, "quiz-validation.mjs")));
  const valid = {
    title: "Validation fixture", course: "Example subject", semester: "3", description: "", instructions: "",
    durationMinutes: 15, totalMarks: 1, opensAt: null, expiresAt: null,
    randomQuestions: false, randomOptions: false, requireFullscreen: true, detectTabSwitch: true,
    terminateOnTabSwitch: true, autoSubmit: true, multipleAttempts: false, showResults: true,
    questions: [{ text: "Question", options: ["A", "B", "C", "D"], correct: 0, marks: 1 }],
  };
  assert.deepEqual(getQuizIssues(valid, true), []);
  const missingOption = structuredClone(valid);
  missingOption.questions[0].options[1] = "";
  const optionIssue = getQuizIssues(missingOption, true).find(issue => issue.path === "questions.0.options.1");
  assert.equal(optionIssue.label, "Question 1 · Option B");
  assert.equal(optionIssue.step, 1);
  assert.match(optionIssue.message, /Enter answer text/);
  const mismatch = getQuizIssues({ ...valid, totalMarks: 20 }, true);
  assert.match(mismatch.find(issue => issue.path === "totalMarks").message, /add up to 1 marks.*total is 20/);
  assert.deepEqual(getQuizIssues({ ...valid, questions: [] }, false), []);
  assert.ok(getQuizIssues({ ...valid, questions: [] }, true).some(issue => issue.path === "questions"));
  const multiple = getQuizIssues({
    ...valid, title: "", durationMinutes: 0, opensAt: "2026-11-12T10:00:00.000Z", expiresAt: "2026-11-12T09:00:00.000Z",
  }, true);
  for (const path of ["title", "durationMinutes", "expiresAt"]) assert.ok(multiple.some(issue => issue.path === path), path);
  assert.equal(getQuizIssues({ ...valid, durationMinutes: 1.5 }, true).find(issue => issue.path === "durationMinutes").step, 0);
  console.log("Passed: exact option errors, marks mismatch, draft vs publish, simultaneous errors, schedule order, and integer validation.");
} finally {
  if (!directory.startsWith(resolve("scripts") + sep)) throw new Error("Unexpected validation test directory");
  rmSync(directory, { recursive: true, force: true });
}
