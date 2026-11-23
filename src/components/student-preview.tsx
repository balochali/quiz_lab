"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { CodeContent } from "./code-content";
import { QuizMarkdown } from "./quiz-markdown";
import { draftSchema, questionTypes, type QuizInput } from "@/lib/quiz-schema";

type PreviewPhase = "loading" | "join" | "active" | "finished" | "missing";

function validSemester(value: string) {
  return /^(?:[1-9]|1\d|20)$/.test(value);
}

export function StudentPreview() {
  const [phase, setPhase] = useState<PreviewPhase>("loading");
  const [quiz, setQuiz] = useState<QuizInput | null>(null);
  const [student, setStudent] = useState({ name: "", rollNumber: "", semester: "" });
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setPhase("missing"); return; }
    const key = "quizlab-student-preview:" + token;
    try {
      const raw = localStorage.getItem(key);
      localStorage.removeItem(key);
      if (!raw) { setPhase("missing"); return; }
      const payload = JSON.parse(raw);
      if (!Number.isFinite(payload.createdAt) || Date.now() - payload.createdAt > 15 * 60 * 1000) { setPhase("missing"); return; }
      const parsed = draftSchema.safeParse(payload.quiz);
      if (!parsed.success) { setPhase("missing"); return; }
      setQuiz(parsed.data as QuizInput);
      setPhase("join");
    } catch { setPhase("missing"); }
  }, []);

  const question = quiz?.questions[position];
  const answered = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);

  function startPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!student.name.trim() || !student.rollNumber.trim() || !validSemester(student.semester)) {
      setError("Enter a name, roll number, and a semester number from 1 to 20.");
      return;
    }
    setError("");
    setPhase("active");
  }

  if (phase === "loading") return <main className="student-preview-shell"><section className="student-preview-card loading-preview"><Sparkles size={26} /><p>Preparing the student preview…</p></section></main>;
  if (phase === "missing" || !quiz) return <main className="student-preview-shell"><section className="student-preview-card stack">
    <span className="preview-icon"><Eye size={28} /></span><p className="eyebrow">Student preview</p><h1>Preview no longer available</h1>
    <p className="muted">Return to the quiz editor and choose <strong>Student view</strong> again. Preview links expire after 15 minutes and never create student records.</p>
  </section></main>;

  if (phase === "join") return <main className="student-preview-shell"><section className="student-preview-card student-preview-join stack">
    <div className="preview-mode-banner"><Eye size={17} /><strong>Lecturer preview mode</strong><span>Nothing entered here is saved.</span></div>
    <p className="eyebrow"><BookOpen size={16} /> Student assessment</p>
    <h1>{quiz.title || "Untitled quiz"}</h1>
    <p className="student-preview-meta">{quiz.course || "Subject to be confirmed"} · Semester {quiz.semester || "—"} · {quiz.durationMinutes || "—"} minutes · {quiz.questions.length} questions</p>
    {quiz.description.trim() && <section className="student-preview-reading"><h2>About this quiz</h2><QuizMarkdown text={quiz.description} /></section>}
    <section className="student-preview-reading student-preview-instructions"><h2>Before you start</h2>
      {quiz.instructions.trim() ? <QuizMarkdown text={quiz.instructions} /> : <p>Your lecturer has not added instructions yet.</p>}
      <ul className="preview-rule-list">
        {quiz.requireFullscreen && <li><ShieldCheck size={16} /> Fullscreen is required for the real assessment.</li>}
        {quiz.detectTabSwitch && <li><ShieldCheck size={16} /> Tab switching is monitored{quiz.terminateOnTabSwitch ? " and ends the real attempt." : "."}</li>}
        {quiz.nextOnly && <li><ShieldCheck size={16} /> Questions use next-only navigation in the real assessment.</li>}
      </ul>
    </section>
    <form className="student-preview-form" onSubmit={startPreview}>
      <label>Full name<input value={student.name} required maxLength={150} onChange={event => setStudent(current => ({ ...current, name: event.target.value }))} /></label>
      <label>Roll number<input value={student.rollNumber} required maxLength={80} onChange={event => setStudent(current => ({ ...current, rollNumber: event.target.value }))} /></label>
      <label>Semester number<input value={student.semester} required inputMode="numeric" maxLength={2} placeholder="e.g. 3" onChange={event => setStudent(current => ({ ...current, semester: event.target.value.replace(/\D/g, "") }))} /><span className="studio-optional">Numbers only, from 1 to 20.</span></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit">Start student preview <ArrowRight size={18} /></button>
    </form>
  </section></main>;

  if (phase === "finished") return <main className="student-preview-shell"><section className="student-preview-card stack">
    <span className="preview-icon preview-icon-success"><CheckCircle2 size={30} /></span><p className="eyebrow">Preview complete</p><h1>This attempt was not submitted</h1>
    <p className="muted">No student, answer, score, monitoring event, or attempt was created. Close this tab and keep editing your quiz.</p>
  </section></main>;

  if (!question) return <main className="student-preview-shell"><section className="student-preview-card stack"><h1>No questions yet</h1><p className="muted">Add a question in the editor, then reopen Student view.</p></section></main>;
  const last = position === quiz.questions.length - 1;
  return <main className="student-preview-shell"><section className="student-preview-exam stack">
    <div className="preview-mode-banner"><Eye size={17} /><strong>Lecturer preview mode</strong><span>Local-only answers · no saving</span></div>
    <header className="student-preview-exam-header"><div><p className="eyebrow">Student assessment preview</p><h1>{quiz.title || "Untitled quiz"}</h1><p>{student.name} · {student.rollNumber} · Semester {student.semester}</p></div><div className="timer"><Clock size={18} />{quiz.durationMinutes || 0}:00</div></header>
    <progress value={answered} max={Math.max(quiz.questions.length, 1)} aria-label="Questions answered" />
    <p className="muted">{answered} of {quiz.questions.length} answered</p>
    {!quiz.nextOnly && <nav className="student-preview-tabs" aria-label="Preview questions">{quiz.questions.map((item, index) => <button key={index} type="button" className={index === position ? "primary" : answers[index] ? "selected" : ""} onClick={() => setPosition(index)}>Q{index + 1}</button>)}</nav>}
    {quiz.nextOnly && <p className="notice">Next-only navigation is enabled. Students can only continue forward in the real assessment.</p>}
    <article className="student-preview-question stack">
      <div className="row between wrap"><p className="eyebrow">Question {position + 1} of {quiz.questions.length} · {question.marks || 0} marks</p>{question.durationSeconds && <span className="question-countdown"><Clock size={17} /><strong>{question.durationSeconds}s per question</strong></span>}</div>
      <h2><CodeContent text={question.text || "Question text will appear here."} /></h2>
      <p className="muted">{questionTypes[question.type]}</p>
      {question.type === "MCQ" && question.options.map((option, index) => <button type="button" key={index} aria-pressed={answers[position] === String(index)} className={"option " + (answers[position] === String(index) ? "selected" : "")} onClick={() => setAnswers(current => ({ ...current, [position]: String(index) }))}><span>{String.fromCharCode(65 + index)}</span><CodeContent text={option || "Option text"} /></button>)}
      {question.type === "BLANK" && <label>Your answer<input value={answers[position] ?? ""} onChange={event => setAnswers(current => ({ ...current, [position]: event.target.value }))} /></label>}
      {question.type === "THEORY" && <label>Your answer<textarea rows={8} value={answers[position] ?? ""} onChange={event => setAnswers(current => ({ ...current, [position]: event.target.value }))} /></label>}
      <div className="row between wrap"><span className="student-preview-save-note">Preview only — answers are not saved.</span>{last ? <button className="primary" type="button" onClick={() => setPhase("finished")}>Finish preview <CheckCircle2 size={17} /></button> : <button className="primary" type="button" onClick={() => setPosition(current => current + 1)}>Next <ArrowRight size={17} /></button>}</div>
    </article>
  </section></main>;
}
