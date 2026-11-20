import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { findResults } from "@/lib/results";
import { ResultsBrowser } from "@/components/results-browser";

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const adminId = await requireAdmin();
  const query = await searchParams;
  const [results, quizzes, subjects, account] = await Promise.all([
    findResults(adminId, {}),
    db.quiz.findMany({ where: { adminId, OR: [{ published: true }, { attempts: { some: {} } }] }, select: { id: true, title: true, course: true }, orderBy: { createdAt: "desc" } }),
    db.subject.findMany({ where: { adminId }, select: { name: true }, orderBy: { name: "asc" } }),
    db.admin.findUniqueOrThrow({ where: { id: adminId }, select: { role: true, canExportResults: true, canCorrectMarks: true } }),
  ]);
  const names = Array.from(new Set([...subjects.map(item => item.name), ...quizzes.map(item => item.course)])).sort();
  const initialQuiz = typeof query.quiz === "string" && quizzes.some(item => item.id === query.quiz) ? query.quiz : "";
  return <ResultsBrowser quizzes={quizzes} subjects={names} results={results.map(row => ({ ...row, submittedAt: row.submittedAt?.toISOString() ?? null }))} initialQuiz={initialQuiz} canAdjust={account.role === "SUPER_ADMIN" || account.canCorrectMarks} canExport={account.role === "SUPER_ADMIN" || account.canExportResults} />;
}
