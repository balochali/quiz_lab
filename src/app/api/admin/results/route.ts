import { adminId } from "@/lib/auth";
import { db } from "@/lib/db";
import { findResults } from "@/lib/results";
import { statusLabel } from "@/lib/quiz-schema";

function csv(value: string | number | undefined) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export async function GET(request: Request) {
  const id = await adminId();
  if (!id) return new Response("Unauthorized", { status: 401 });
  const account = await db.admin.findUnique({ where: { id }, select: { canExportResults: true, role: true } });
  if (account?.role !== "SUPER_ADMIN" && !account?.canExportResults) return new Response("Export disabled by administrator", { status: 403 });
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const results = await findResults(id, query);
  const rows = [["Student", "Roll number", "Semester", "Quiz", "Obtained marks", "Total marks", "Percentage", "Status", "Monitoring events", "Submitted (UTC)"],
    ...results.map(a => [a.studentName, a.rollNumber, a.semester, a.quizTitle, a.submittedAt && !a.gradingPending ? a.obtainedMarks : undefined, a.totalMarks,
      a.submittedAt && !a.gradingPending ? Math.round(a.obtainedMarks * 100 / a.totalMarks) : undefined,
      (a.gradingPending ? statusLabel(a.status) + " – Awaiting grading" : statusLabel(a.status)), a._count.violations, a.submittedAt?.toISOString()])];
  return new Response("\uFEFF" + rows.map(row => row.map(csv).join(",")).join("\r\n"), { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="quiz-results.csv"', "Cache-Control": "private, no-store",
  } });
}
