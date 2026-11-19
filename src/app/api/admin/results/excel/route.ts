import { adminId } from "@/lib/auth";
import { db } from "@/lib/db";
import { findResults } from "@/lib/results";
import { resultsWorkbook } from "@/lib/results-workbook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = await adminId();
  if (!id) return new Response("Sign in to export results.", { status: 401 });
  const account = await db.admin.findUniqueOrThrow({ where: { id }, select: { role: true, canExportResults: true } });
  if (account.role !== "SUPER_ADMIN" && !account.canExportResults) return new Response("Export disabled by administrator.", { status: 403 });
  const quizId = new URL(request.url).searchParams.get("quiz");
  if (!quizId) return new Response("Choose a quiz to export.", { status: 400 });
  const quiz = await db.quiz.findFirst({ where: { id: quizId, adminId: id }, select: { id: true, title: true } });
  if (!quiz) return new Response("Quiz not found.", { status: 404 });
  const bytes = await resultsWorkbook(await findResults(id, { quiz: quiz.id }));
  const filename = quiz.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 70) || "quiz";
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}-results.xlsx"`,
    "Cache-Control": "private, no-store",
  } });
}
