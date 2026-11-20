"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Download, Users, Trophy, Clock, RefreshCw, Search, PencilLine } from "lucide-react";
import { subjectStyle } from "@/lib/subject-style";
import { finalMarks, matchesStudent } from "@/lib/score-adjustments";
import { AdjustMarksDialog } from "./adjust-marks-dialog";
import { statusLabel } from "@/lib/quiz-schema";

export type ResultRow = { id: string; quizId: string; studentName: string; rollNumber: string; semester: string; obtainedMarks: number; adjustedMarks: number | null; markAdjustments: string; totalMarks: number; gradingPending: boolean; status: string; submittedAt: string | null; _count: { violations: number } };
type Quiz = { id: string; title: string; course: string };
function summary(rows: ResultRow[]) {
  const graded = rows.filter(row => row.submittedAt && !row.gradingPending);
  return { count: rows.length, graded: graded.length, pending: rows.filter(row => row.gradingPending).length, average: graded.length ? Math.round(graded.reduce((sum, row) => sum + (row.totalMarks > 0 ? finalMarks(row) * 100 / row.totalMarks : 0), 0) / graded.length) : null };
}

export function ResultsBrowser({ quizzes, results, subjects, initialQuiz = "", canExport, canAdjust }: { quizzes: Quiz[]; results: ResultRow[]; subjects: string[]; initialQuiz?: string; canExport: boolean; canAdjust: boolean }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [subject, setSubject] = useState<string | null>(null);
  const [selected, setSelected] = useState(initialQuiz);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [search, setSearch] = useState("");
  const [adjusting, setAdjusting] = useState<ResultRow | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const groups = useMemo(() => {
    const map = new Map<string, ResultRow[]>();
    for (const result of results) { const group = map.get(result.quizId) ?? []; group.push(result); map.set(result.quizId, group); }
    return map;
  }, [results]);
  const visible = quizzes.filter(quiz => subject === null || quiz.course === subject);
  const quiz = quizzes.find(item => item.id === selected);
  const rows = quiz ? groups.get(quiz.id) ?? [] : visible.flatMap(item => groups.get(item.id) ?? []);
  const filteredRows = rows.filter(row => matchesStudent(row, search));
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / 25));
  const currentPage = Math.min(page, totalPages);
  const stats = summary(rows);
  function choose(id: string) { setSelected(id); setPage(1); setSearch(""); setSavedMessage(""); setExportError(""); requestAnimationFrame(() => heading.current?.focus()); }
  async function exportExcel() {
    if (!quiz) return;
    setExporting(true); setExportError("");
    try {
      const response = await fetch("/api/admin/results/excel?" + new URLSearchParams({ quiz: quiz.id }));
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = quiz.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 70) + "-results.xlsx";
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setExportError(error instanceof Error ? error.message : "Could not export results. Try again."); }
    finally { setExporting(false); }
  }
  return <div className="results-browser">
    {adjusting && <AdjustMarksDialog row={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); setSavedMessage("Updated marks saved."); startRefresh(() => router.refresh()); }} />}
    <header className="row between wrap"><div><p className="eyebrow">Assessment records</p><h1>Results</h1><p className="muted">Choose a subject, explore a quiz, and review your students’ progress.</p></div><button type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}><RefreshCw size={16} />{refreshing ? "Updating…" : "Refresh results"}</button></header>
    <div className="results-subject-tabs" role="group" aria-label="Results by subject">
      {[null, ...subjects].map(name => <button type="button" key={name ?? "all"} aria-pressed={subject === name} onClick={() => { setSubject(name); choose(""); }}><BookOpen size={16} />{name ?? "All subjects"}<span>{quizzes.filter(item => name === null || item.course === name).length}</span></button>)}
    </div>
    <div className="results-metrics"><div><span>Student attempts</span><strong>{stats.count}</strong><small>{quiz ? "This quiz" : subject ?? "All subjects"}</small></div><div><span>Graded submissions</span><strong>{stats.graded}</strong><small>Final scores available</small></div><div><span>Average score</span><strong>{stats.average === null ? "—" : stats.average + "%"}</strong><small>Graded submissions only</small></div><div><span>Awaiting grading</span><strong>{stats.pending}</strong><small>Written answers to review</small></div></div>
    {quiz ? <>
      <button type="button" onClick={() => choose("")}><ArrowLeft size={16} /> Back to quizzes</button>
      <section className="card results-quiz-detail"><div className="row between wrap"><div><p className="eyebrow">{quiz.course}</p><h2 ref={heading} tabIndex={-1}>{quiz.title}</h2><p className="muted">{rows.length} student attempts</p></div>{canExport ? <button className="primary" type="button" disabled={exporting} onClick={() => void exportExcel()}><Download size={17} />{exporting ? "Preparing Excel…" : "Export to Excel"}</button> : <span className="badge">Export disabled by administrator</span>}</div>
        {exportError && <p className="error" role="alert">{exportError}</p>}
        <div className="results-student-search"><label><span className="row"><Search size={17} /> Find a student</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or roll number — any letter case" /></label><small>{filteredRows.length} matching of {rows.length} attempts. Excel exports all attempts for this quiz.</small></div>
        {savedMessage && <p className="notice" role="status">{savedMessage}</p>}
        {!rows.length ? <div className="empty"><Users size={30} /><h3>No attempts yet</h3><p>Student results will appear here after they begin this quiz.</p></div> : !filteredRows.length ? <div className="empty"><h3>No matching students</h3><p>Try another name or roll number.</p></div> : <>
          <div className="scroll"><table><thead><tr>{["Student", "Roll number", "Semester", "Original marks", "Updated marks", "Score", "Status", "Events", "Submitted (PKT)"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filteredRows.slice((currentPage - 1) * 25, currentPage * 25).map(row => <tr key={row.id}><td><Link href={"/admin/results/" + row.id}>{row.studentName}</Link></td><td>{row.rollNumber}</td><td>{row.semester}</td><td>{row.gradingPending ? "Awaiting grading" : row.submittedAt ? `${row.obtainedMarks} / ${row.totalMarks}` : "—"}</td><td><div className="updated-marks-cell"><strong>{row.submittedAt && !row.gradingPending ? `${finalMarks(row)} / ${row.totalMarks}` : "—"}</strong>{row.adjustedMarks !== null && <small>Adjusted by lecturer</small>}{canAdjust && row.submittedAt && !row.gradingPending && <button type="button" disabled={refreshing} onClick={() => setAdjusting(row)} aria-label={"Adjust marks for " + row.studentName}><PencilLine size={13} /> Adjust</button>}</div></td><td><span className={"result-score " + (row.gradingPending || !row.submittedAt ? "result-score-pending" : finalMarks(row) / row.totalMarks >= .5 ? "result-score-high" : "result-score-low")}>{row.submittedAt && !row.gradingPending && row.totalMarks > 0 ? Math.round(finalMarks(row) * 100 / row.totalMarks) + "%" : "—"}</span></td><td><span className="badge">{row.gradingPending ? "Awaiting grading" : statusLabel(row.status)}</span></td><td>{row._count.violations}</td><td>{row.submittedAt ? new Date(row.submittedAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "—"}</td></tr>)}</tbody></table></div>
          <div className="row between wrap results-pagination"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {totalPages}</span><button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</button></div>
        </>}
      </section>
    </> : <><h2 ref={heading} tabIndex={-1}>{subject ?? "All quizzes"}</h2><div className="results-quiz-grid">{visible.map(item => {
      const { Icon, theme } = subjectStyle(item.course);
      const details = summary(groups.get(item.id) ?? []);
      return <button type="button" key={item.id} className={"results-quiz-card subject-" + theme} onClick={() => choose(item.id)}><span className="results-quiz-cover"><Icon size={30} /><span>{item.course}</span></span><span className="results-quiz-body"><strong>{item.title}</strong><span className="results-quiz-numbers"><span><Users size={17} />{details.count} attempts</span><span><Trophy size={17} />{details.average === null ? "No scores yet" : details.average + "% average"}</span></span>{details.pending > 0 && <span className="results-grading-note"><Clock size={15} />{details.pending} awaiting grading</span>}<span className="results-open-label">View student results <ArrowRight size={17} /></span></span></button>;
    })}</div>{!visible.length && <div className="card empty"><BookOpen size={32} /><h3>No quizzes yet</h3><p>Published quizzes and quizzes with attempts will appear here.</p></div>}</>}
  </div>;
}
