import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
const directory = mkdtempSync(resolve("scripts/.monitoring-test-"));
try {
  writeFileSync(join(directory, "monitoring.mjs"), ts.transpileModule(readFileSync("src/lib/monitoring.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  const { monitoringTimeline, formatKarachiDateTime, monitoringContext, durationLabel } = await import(pathToFileURL(join(directory, "monitoring.mjs")));
  const base = Date.parse("2026-11-19T23:30:00Z");
  const context = JSON.stringify({ version: 1, visibility: "visible", hasFocus: false, fullscreen: true, questionNumber: 2 });
  const event = (id, type, seconds, details = context) => ({ id, type, createdAt: new Date(base + seconds * 1000), details });
  const rows = monitoringTimeline([event("back", "FOCUS", 8), event("lost", "BLUR", 0), event("hidden", "TAB_SWITCH", 1), event("visible", "VISIBLE", 6), event("old", "BLUR", -10, null), event("again", "BLUR", 2)]);
  assert.equal(rows.find(row => row.id === "lost").durationMs, 8000);
  assert.equal(rows.find(row => row.id === "back").durationMs, 8000);
  assert.equal(rows.find(row => row.id === "hidden").durationMs, 5000);
  assert.equal(rows.find(row => row.id === "old").durationMs, null);
  assert.equal(rows.find(row => row.id === "again").durationMs, null);
  assert.equal(monitoringContext("not json"), null);
  const date = formatKarachiDateTime(new Date(base));
  assert.ok(date.includes("20 Nov 2026")); assert.ok(date.includes("04:30:00 am")); assert.ok(date.endsWith("PKT"));
  assert.equal(durationLabel(8000), "8 seconds");
  console.log("Passed: chronological timeline, focus/visibility pairing, no fabricated legacy intervals, duplicate-loss handling, malformed metadata, and Karachi date rollover.");
} finally {
  if (!directory.startsWith(resolve("scripts") + sep)) throw new Error("Unexpected test directory");
  rmSync(directory, { recursive: true, force: true });
}
