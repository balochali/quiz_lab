import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { findResults } from "@/lib/results";
import { statuses, statusLabel } from "@/lib/quiz-schema";

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const adminId = await requireAdmin();
  const raw = await searchParams;
  const query = Object.fromEntries(["q", "quiz", "semester", "status"].flatMap(key =>
    typeof raw[key] === "string" && raw[key] ? [[key, raw[key]]] : []));
  const [results, quizzes, semesters] = await Promise.all([
    findResults(adminId, query),
    db.quiz.findMany({ where: { adminId }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.quizAttempt.findMany({ where: { quiz: { adminId } }, distinct: ["semester"], select: { semester: true }, orderBy: { semester: "asc" } }),
  ]);
  const graded = results.filter(a => a.submittedAt && !a.gradingPending);
  const average = graded.length ? Math.round(graded.reduce((sum, a) => sum + a.obtainedMarks * 100 / a.totalMarks, 0) / graded.length) : null;
  return <>
    <header className="row between wrap"><div><p className="eyebrow">Assessment records</p><h1>Results</h1></div>
      <a className="button primary" href={"/api/admin/results?" + new URLSearchParams(query)}><Download size={17} /> Export CSV</a></header>
    <div className="results-metrics"><div><span>Matching attempts</span><strong>{results.length}</strong><small>Current filters</small></div><div><span>Graded submissions</span><strong>{graded.length}</strong><small>Final scores available</small></div><div><span>Average score</span><strong>{average === null ? "—" : average + "%"}</strong><small>Graded submissions only</small></div><div><span>Awaiting grading</span><strong>{results.filter(a => a.gradingPending).length}</strong><small>Written answers to review</small></div></div>
    <form className="card field-grid results-filters">
      <label>Search<input name="q" placeholder="Name or roll number" defaultValue={query.q} /></label>
      <label>Quiz<select name="quiz" defaultValue={query.quiz ?? ""}><option value="">All quizzes</option>{quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select></label>
      <label>Semester<select name="semester" defaultValue={query.semester ?? ""}><option value="">All semesters</option>{semesters.map(s => <option key={s.semester}>{s.semester}</option>)}</select></label>
      <label>Status<select name="status" defaultValue={query.status ?? ""}><option value="">All statuses</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <button><Search size={16} /> Apply filters</button><Link className="button" href="/admin/results">Clear</Link>
    </form>
    <section className="card scroll results-table"><div className="row between wrap"><h2>Student attempts</h2><span className="badge">{results.length} records</span></div>
      {!results.length ? <div className="empty"><h3>No matching attempts</h3><p>Results appear here as students take your quizzes.</p></div> :
        <table><thead><tr>{["Student", "Roll number", "Semester", "Quiz", "Marks", "%", "Status", "Violations", "Submitted"].map(label => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{results.map(a => <tr key={a.id}>
            <td><Link href={"/admin/results/" + a.id}>{a.studentName}</Link></td><td>{a.rollNumber}</td><td>{a.semester}</td><td>{a.quizTitle}</td>
            <td>{a.gradingPending ? "Awaiting grading" : a.submittedAt ? a.obtainedMarks + " / " + a.totalMarks : "—"}</td>
            <td><span className={"result-score " + (a.gradingPending || !a.submittedAt ? "result-score-pending" : a.obtainedMarks / a.totalMarks >= .5 ? "result-score-high" : "result-score-low")}>{a.submittedAt && !a.gradingPending ? Math.round(a.obtainedMarks * 100 / a.totalMarks) + "%" : "—"}</span></td>
            <td><span className="badge">{statusLabel(a.status)}</span></td><td>{a._count.violations}</td>
            <td>{a.submittedAt?.toISOString().replace("T", " ").slice(0, 16) ?? "—"}{a.submittedAt && " UTC"}</td>
          </tr>)}</tbody></table>}
    </section>
  </>;
}
