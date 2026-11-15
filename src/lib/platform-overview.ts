import "server-only";
import { db } from "./db";

export async function loadPlatformOverview() {
  const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const today = new Date(dayKey(new Date()) + "T00:00:00+05:00");
  const since = new Date(today.getTime() - 29 * 86400000);
  const started = performance.now();
  const [lecturers, students, quizzes, attempts, subjects, statuses, recent, suspended, pending] = await Promise.all([
    db.admin.count({ where: { role: "LECTURER" } }), db.student.count(), db.quiz.count(), db.quizAttempt.count(), db.subject.count(),
    db.quizAttempt.groupBy({ by: ["status"], _count: { _all: true } }),
    db.quizAttempt.findMany({ where: { startedAt: { gte: since } }, select: { startedAt: true, studentId: true } }),
    db.admin.count({ where: { role: "LECTURER", suspended: true } }), db.quizAttempt.count({ where: { gradingPending: true } }),
  ]);
  const queryMs = Math.round(performance.now() - started);
  const daily = new Map<string, { attempts: number; students: Set<string> }>();
  for (const attempt of recent) {
    const key = dayKey(attempt.startedAt);
    const value = daily.get(key) ?? { attempts: 0, students: new Set<string>() };
    value.attempts++; value.students.add(attempt.studentId); daily.set(key, value);
  }
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(since.getTime() + index * 86400000);
    const key = dayKey(date); const value = daily.get(key);
    return { date: key, label: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short" }).format(date), attempts: value?.attempts ?? 0, students: value?.students.size ?? 0 };
  });
  const completed = statuses.find(row => row.status === "SUBMITTED")?._count._all ?? 0;
  const active = statuses.find(row => row.status === "IN_PROGRESS")?._count._all ?? 0;
  return { lecturers, students, quizzes, attempts, subjects, suspended, pending, queryMs, days, completed, active };
}
