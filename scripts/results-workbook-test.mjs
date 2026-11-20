import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import ExcelJS from "exceljs";
const directory = mkdtempSync(resolve("scripts/.results-workbook-test-"));
try {
  for (const name of ["quiz-schema", "score-adjustments", "results-workbook"]) {
    const source = readFileSync("src/lib/" + name + ".ts", "utf8").replace('"./quiz-schema"', '"./quiz-schema.mjs"').replace('"./score-adjustments"', '"./score-adjustments.mjs"');
    writeFileSync(join(directory, name + ".mjs"), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  }
  const { resultsWorkbook } = await import(pathToFileURL(join(directory, "results-workbook.mjs")));
  const { matchesStudent, finalMarks } = await import(pathToFileURL(join(directory, "score-adjustments.mjs")));
  const student = { studentName: "Hussain Ahmed", rollNumber: "CSD241033" };
  for (const query of ["hussain", "HUSSAIN", "aHmEd", "csd241033", " CSD241033 "]) assert.equal(matchesStudent(student, query), true);
  assert.equal(matchesStudent(student, "someone else"), false);
  assert.equal(finalMarks({ obtainedMarks: 7, totalMarks: 10, adjustedMarks: 0 }), 0);
  assert.equal(finalMarks({ obtainedMarks: 7, totalMarks: 10, adjustedMarks: null }), 7);
  assert.equal(finalMarks({ obtainedMarks: 7, totalMarks: 5, adjustedMarks: 9 }), 5);
  const base = { studentName: "=1+1", rollNumber: "00123", semester: "3", quizTitle: "Quiz fixture", obtainedMarks: 7, totalMarks: 10, status: "SUBMITTED", gradingPending: false, submittedAt: new Date("2026-11-19T05:00:00Z"), _count: { violations: 2 } };
  const bytes = await resultsWorkbook([base, { ...base, studentName: "Pending", gradingPending: true }, { ...base, studentName: "Zero", obtainedMarks: 0 }]);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell("A2").value, "=1+1");
  assert.equal(sheet.getCell("A2").type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell("B2").value, "00123");
  assert.equal(sheet.getCell("E2").value, 7); assert.equal(sheet.getCell("G2").value, .7);
  assert.equal(sheet.getCell("E3").value, null); assert.equal(sheet.getCell("G3").value, null);
  assert.equal(sheet.getCell("E4").value, 0);
  const adjusted = new ExcelJS.Workbook(); await adjusted.xlsx.load(await resultsWorkbook([{ ...base, adjustedMarks: 9, markAdjustments: JSON.stringify([{ reason: "Two grace marks" }]) }]));
  assert.equal(adjusted.worksheets[0].getCell("E2").value, 7);
  assert.equal(adjusted.worksheets[0].getCell("K2").value, 9);
  assert.equal(adjusted.worksheets[0].getCell("G2").value, .9);
  assert.equal(adjusted.worksheets[0].getCell("L2").value, "Two grace marks");
  assert.equal(sheet.getCell("J2").value, "2026-11-19 10:00:00");
  assert.equal(sheet.views[0].state, "frozen");
  const empty = new ExcelJS.Workbook(); await empty.xlsx.load(await resultsWorkbook([]));
  assert.equal(empty.worksheets[0].rowCount, 1);
  console.log("Passed: genuine XLSX round-trip, scores/percentages, pending grading, zero marks, safe string cells, roll-number formatting, PKT timestamps, and empty exports.");
} finally {
  if (!directory.startsWith(resolve("scripts") + sep)) throw new Error("Unexpected test path");
  rmSync(directory, { recursive: true, force: true });
}
