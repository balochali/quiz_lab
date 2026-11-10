import { adminId } from "@/lib/auth";
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
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const results = await findResults(id, query);
  const rows = [["Student", "Roll number", "Semester", "Quiz", "Obtained marks", "Total marks", "Percentage", "Status", "Monitoring events", "Submitted (UTC)"],
    ...results.map(a => [a.studentName, a.rollNumber, a.semester, a.quizTitle, a.submittedAt ? a.obtainedMarks : undefined, a.totalMarks,
      a.submittedAt ? Math.round(a.obtainedMarks * 100 / a.totalMarks) : undefined,
      statusLabel(a.status), a._count.violations, a.submittedAt?.toISOString()])];
  return new Response("\uFEFF" + rows.map(row => row.map(csv).join(",")).join("\r\n"), { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="quiz-results.csv"', "Cache-Control": "private, no-store",
  } });
}
