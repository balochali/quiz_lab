export type ScoreRecord = { obtainedMarks: number; totalMarks: number; adjustedMarks?: number | null };
export type MarkAdjustment = { actorId: string; actorEmail: string; at: string; from: number | null; to: number | null; originalScore: number; totalMarks: number; reason: string };
export function finalMarks(record: ScoreRecord) { return record.adjustedMarks == null ? record.obtainedMarks : Math.max(0, Math.min(record.totalMarks, record.adjustedMarks)); }
export function adjustmentHistory(raw?: string | null): MarkAdjustment[] {
  try { const value = JSON.parse(raw ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function matchesStudent(row: { studentName: string; rollNumber: string }, query: string) {
  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en").trim();
  const term = normalize(query);
  return !term || normalize(row.studentName).includes(term) || normalize(row.rollNumber).includes(term);
}
