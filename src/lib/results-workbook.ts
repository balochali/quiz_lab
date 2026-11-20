import ExcelJS from "exceljs";
import { finalMarks, adjustmentHistory } from "./score-adjustments";
import { statusLabel } from "./quiz-schema";

type ExportRow = { studentName: string; rollNumber: string; semester: string; quizTitle: string; obtainedMarks: number; adjustedMarks?: number | null; markAdjustments?: string; totalMarks: number; gradingPending: boolean; status: string; submittedAt: Date | null; _count: { violations: number } };

export async function resultsWorkbook(rows: ExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QuizLab";
  const sheet = workbook.addWorksheet("Student results", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Student name", key: "name", width: 32 }, { header: "Roll number", key: "roll", width: 22 },
    { header: "Semester", key: "semester", width: 13 }, { header: "Quiz", key: "quiz", width: 38 },
    { header: "Original marks", key: "score", width: 18 }, { header: "Total marks", key: "total", width: 15 },
    { header: "Percentage", key: "percentage", width: 15 }, { header: "Status", key: "status", width: 34 },
    { header: "Monitoring events", key: "events", width: 20 }, { header: "Submitted (PKT)", key: "submitted", width: 24 },
    { header: "Updated marks (final)", key: "updated", width: 23 }, { header: "Adjustment reason", key: "reason", width: 45 },
  ];
  for (const row of rows) {
    const graded = !!row.submittedAt && !row.gradingPending;
    sheet.addRow({ name: row.studentName, roll: row.rollNumber, semester: row.semester, quiz: row.quizTitle,
      score: graded ? row.obtainedMarks : null, total: row.totalMarks,
      percentage: graded && row.totalMarks > 0 ? finalMarks(row) / row.totalMarks : null,
      updated: graded ? finalMarks(row) : null, reason: adjustmentHistory(row.markAdjustments).at(-1)?.reason ?? "",
      status: statusLabel(row.status) + (row.gradingPending ? " – Awaiting grading" : ""), events: row._count.violations,
      submitted: row.submittedAt ? new Date(row.submittedAt.getTime() + 5 * 3600000).toISOString().replace("T", " ").slice(0, 19) : "",
    });
  }
  sheet.getColumn("percentage").numFmt = "0%";
  sheet.getRow(1).height = 30;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7950B3" } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: 12 } };
  sheet.eachRow((row, index) => {
    row.alignment = { vertical: "middle", wrapText: true };
    if (index > 1) {
      row.height = 30;
      if (index % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F0FC" } };
    }
  });
  return workbook.xlsx.writeBuffer();
}
