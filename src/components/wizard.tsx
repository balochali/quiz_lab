"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { saveQuiz } from "@/app/admin/actions";
import { quizSchema, settings, type QuizInput } from "@/lib/quiz-schema";
import { formatQuizOpening, pakistanInputValue } from "@/lib/quiz-schedule";
import { CopyLink } from "./copy-link";

const blank: QuizInput = {
  title: "", course: "", opensAt: null, expiresAt: null, semester: "", description: "", instructions: "", durationMinutes: 15, totalMarks: 10,
  randomQuestions: false, randomOptions: false, requireFullscreen: true, detectTabSwitch: true,
  terminateOnTabSwitch: true, autoSubmit: true, multipleAttempts: false, showResults: true, questions: [],
};

const steps = ["Quiz information", "Questions", "Settings", "Publish"];

export function Wizard({ subjects, initial, id, code, locked = false }: { subjects: string[]; initial?: QuizInput; id?: string; code?: string; locked?: boolean }) {
  const [quiz, setQuiz] = useState(initial ?? blank);
  const [savedId, setSavedId] = useState(id);
  const [publishedCode, setPublishedCode] = useState(code);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const update = <K extends keyof QuizInput>(key: K, value: QuizInput[K]) => setQuiz(previous => ({ ...previous, [key]: value }));
  const marks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

  function move(index: number, direction: number) {
    const questions = [...quiz.questions];
    [questions[index], questions[index + direction]] = [questions[index + direction], questions[index]];
    update("questions", questions);
  }

  async function persist(publish: boolean) {
    setError("");
    setNotice("");
    if (!quizSchema.safeParse(quiz).success) {
      setError("Complete the required quiz fields and all four options for each question.");
      return;
    }
    setBusy(true);
    try {
      const result = await saveQuiz(savedId, quiz, publish);
      if (!("id" in result) || !result.id) setError(result.error ?? "Could not save quiz.");
      else {
        setSavedId(result.id);
        setPublishedCode(result.published ? result.code : undefined);
        setNotice(result.published ? "Quiz published. Share the student link below." : "Draft saved.");
        if (result.id) window.history.replaceState(null, "", "/admin/quizzes/" + result.id + "/edit");
      }
    } catch {
      setError("Could not save the quiz. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <header><Link href="/admin/quizzes">← Quiz library</Link><h1>{id ? quiz.title : "Create a quiz"}</h1>
      <p className="muted">Set up a single answer assessment for your class.</p></header>
    <nav className="wizard-steps" aria-label="Quiz setup">{steps.map((label, i) => <button key={label}
      className={step === i ? "primary" : step > i ? "step-complete" : ""} aria-current={step === i ? "step" : undefined}
      onClick={() => { setStep(i); setPreview(false); }}>{i + 1}. {label}</button>)}</nav>
    {locked && <p className="notice">This quiz has attempts. Its questions and settings are locked.</p>}
    {publishedCode && savedId && <Link className="button" href={"/admin/quizzes/" + savedId + "/leaderboard"}>Results and leaderboard</Link>}
    <motion.section key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card stack">
      <div className="row between"><div><p className="eyebrow">Step {step + 1} of 4</p><h2>{steps[step]}</h2></div><span className="badge">{Math.round((step + 1) / 4 * 100)}% through setup</span></div>
      <progress aria-label="Quiz setup progress" value={step + 1} max={4} />
      <fieldset disabled={locked || busy} className="stack">
        {step === 0 && <>
          <div className="field-grid">
            <label>Quiz title<input required value={quiz.title} onChange={e => update("title", e.target.value)} /></label>
            <label>Lab subject<select required value={quiz.course} onChange={e => update("course", e.target.value)}>
              <option value="" disabled>Select a lab subject</option>
              {quiz.course && !subjects.includes(quiz.course) && <option>{quiz.course}</option>}
              {subjects.map(subject => <option key={subject}>{subject}</option>)}
            </select></label>
            <label>Semester<input required value={quiz.semester} onChange={e => update("semester", e.target.value)} /></label>
            <label>Duration (minutes)<input type="number" min={1} max={360} value={quiz.durationMinutes} onChange={e => update("durationMinutes", Number(e.target.value))} /></label>
            <label>Total marks<input type="number" min={1} value={quiz.totalMarks} onChange={e => update("totalMarks", Number(e.target.value))} /></label>
          </div>
          <label>Description<textarea value={quiz.description} onChange={e => update("description", e.target.value)} /></label>
          <label>Student instructions<textarea value={quiz.instructions} onChange={e => update("instructions", e.target.value)} /></label>
        </>}
        {step === 1 && <>
          <p className="muted">{quiz.questions.length} questions · {marks} of {quiz.totalMarks} marks assigned</p>
          {quiz.questions.map((q, index) => {
            function change(fields: Partial<typeof q>) {
              update("questions", quiz.questions.map((item, i) => i === index ? { ...item, ...fields } : item));
            }
            return <article className="question-editor stack" key={index}>
              <div className="row between wrap"><h3>Question {index + 1}</h3><div className="row">
                <button aria-label="Move question up" disabled={!index} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
                <button aria-label="Move question down" disabled={index === quiz.questions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
                <button aria-label="Delete question" onClick={() => update("questions", quiz.questions.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
              </div></div>
              <label>Question text<textarea value={q.text} onChange={e => change({ text: e.target.value })} /></label>
              <div className="field-grid">{q.options.map((option, i) => <div className={"option-editor option-" + i} key={i}>
                <label>Option {String.fromCharCode(65 + i)}<input value={option} onChange={e => change({ options: q.options.map((text, j) => j === i ? e.target.value : text) })} /></label>
                <label className="check"><input type="radio" name={"correct-" + index} checked={q.correct === i} onChange={() => change({ correct: i })} /> Correct answer</label>
              </div>)}</div>
              <label>Marks<input type="number" min={1} max={1000} value={q.marks} onChange={e => change({ marks: Number(e.target.value) })} /></label>
            </article>;
          })}
          <button onClick={() => update("questions", [...quiz.questions, { text: "", marks: 1, options: ["", "", "", ""], correct: 0 }])} disabled={quiz.questions.length >= 200}><Plus size={17} /> Add question</button>
        </>}
        {step === 2 && <>
          <label>Student results<select value={quiz.showResults ? "automatic" : "manual"} onChange={e => update("showResults", e.target.value === "automatic")}>
            <option value="automatic">Show each student’s score after their attempt</option>
            <option value="manual">Wait for me to release scores</option>
          </select></label>
        </>}
        {step === 2 && Object.entries(settings).map(([key, label]) => {
          const setting = key as keyof typeof settings;
          return <label className="check setting" key={key}><input type="checkbox" checked={quiz[setting]}
            disabled={setting === "terminateOnTabSwitch" && !quiz.detectTabSwitch}
            onChange={e => update(setting, e.target.checked)} /> {label}</label>;
        })}
        {step === 3 && <>
          <h3>{quiz.title || "Untitled quiz"}</h3><p>{quiz.course} · {quiz.semester} · {quiz.durationMinutes} minutes</p>
          <p>{quiz.questions.length} questions · {marks} assigned / {quiz.totalMarks} total marks</p>
          <label>Quiz opening time (PKT)
            <input type="datetime-local" value={quiz.opensAt ? pakistanInputValue(quiz.opensAt) : ""} onChange={e => {
              const value = e.target.value;
              const timestamp = Date.parse(value + "+05:00");
              update("opensAt", Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null);
            }} />
          </label>
          <div className="row wrap">
            <button type="button" onClick={() => update("opensAt", new Date(Math.ceil((Date.now() + 600000) / 60000) * 60000).toISOString())}>Open in 10 minutes</button>
            <button type="button" onClick={() => update("opensAt", null)}>Open on publish</button>
          </div>
          <p className="muted">{quiz.opensAt ? "Students can join from " + formatQuizOpening(Date.parse(quiz.opensAt)) + ". They see a countdown before then." : "Students can join as soon as you publish."}</p>
          <label>Link expiration (PKT, optional)
            <input type="datetime-local" value={quiz.expiresAt ? pakistanInputValue(quiz.expiresAt) : ""} onChange={e => {
              const timestamp = Date.parse(e.target.value + "+05:00");
              update("expiresAt", Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null);
            }} />
          </label>
          <p className="muted">{quiz.expiresAt
            ? "The link stops accepting new attempts at " + formatQuizOpening(Date.parse(quiz.expiresAt)) + "."
            : "Leave this blank to keep the link open until you close it manually."}</p>
          <p>Results: {quiz.showResults ? "Show after each attempt" : "Release manually"}</p>
          <p>{Object.entries(settings).filter(([key]) => quiz[key as keyof typeof settings]).map(([, label]) => label).join(" · ")}</p>
          <div className="row wrap"><button onClick={() => void persist(false)}>{publishedCode ? "Unpublish and save draft" : "Save as draft"}</button>
            <button className="primary" onClick={() => void persist(true)}>{publishedCode ? "Update published quiz" : "Publish quiz"}</button></div>
        </>}
      </fieldset>
      {(step === 1 || step === 3) && <button onClick={() => setPreview(!preview)}>{preview ? "Close preview" : "Preview quiz"}</button>}
      {preview && <div className="notice stack">{quiz.questions.length ? quiz.questions.map((q, i) => <div key={i}>
        <strong>{i + 1}. {q.text}</strong><ol type="A">{q.options.map((text, index) => <li key={index}>{text}</li>)}</ol>
      </div>) : <p>Add questions to see a preview.</p>}</div>}
      {error && <p role="alert" className="error">{error}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {step === 3 && publishedCode && <CopyLink code={publishedCode} />}
      <div className="row between"><button disabled={step === 0} onClick={() => { setStep(step - 1); setPreview(false); }}>Back</button>
        {step < 3 && <button className="primary" onClick={() => { setStep(step + 1); setPreview(false); }}>Continue</button>}</div>
    </motion.section>
  </>;
}

