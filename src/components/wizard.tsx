"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowDown, ArrowUp, ArrowRight, BookOpen, CalendarClock, Check, CheckCircle2, Clock, Eye, FileText, Flag, ListChecks, Plus, Rocket, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { saveQuiz } from "@/app/admin/actions";
import { questionTypes, settings, type QuizInput } from "@/lib/quiz-schema";
import { formatQuizOpening, pakistanInputValue } from "@/lib/quiz-schedule";
import { getQuizIssues, quizFieldId, type QuizIssue } from "@/lib/quiz-validation";
import { SubjectPicker } from "./subject-picker";
import { CopyLink } from "./copy-link";
import { QuizSettings } from "./quiz-settings";

const blank: QuizInput = {
  title: "", course: "", opensAt: null, expiresAt: null, semester: "", description: "", instructions: "", durationMinutes: 15, totalMarks: 10,
  randomQuestions: false, randomOptions: false, requireFullscreen: true, detectTabSwitch: true,
  terminateOnTabSwitch: true, autoSubmit: true, multipleAttempts: false, showResults: true, questions: [],
};

const steps = ["Quiz information", "Questions", "Settings", "Publish"];
const stepIcons = [FileText, ListChecks, ShieldCheck, Rocket];
const stepHints = ["Set the essentials", "Build your challenge", "Choose your rules", "Ready for your class"];

export function Wizard({ subjects, initial, id, code, locked = false }: { subjects: string[]; initial?: QuizInput; id?: string; code?: string; locked?: boolean }) {
  const [quiz, setQuiz] = useState(initial ?? blank);
  const [savedId, setSavedId] = useState(id);
  const [publishedCode, setPublishedCode] = useState(code);
  const [step, setStep] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const activeQuestion = Math.max(0, Math.min(questionIndex, quiz.questions.length - 1));
  const [questionCount, setQuestionCount] = useState(initial?.questions.length || 10);
  const [format, setFormat] = useState<"MCQ" | "BLANK" | "THEORY" | "MIXED">(() => {
    const types = new Set(initial?.questions.map(question => question.type));
    return types.size === 1 ? initial!.questions[0].type : types.size > 1 ? "MIXED" : "MCQ";
  });
  const [confirmResize, setConfirmResize] = useState(false);
  function emptyQuestion(type: "MCQ" | "BLANK" | "THEORY" = format === "MIXED" ? "MCQ" : format): QuizInput["questions"][number] {
    return { text: "", marks: 1, options: ["", "", "", ""], correct: 0, type, acceptedAnswers: [] };
  }
  function prepareQuestions(confirmed = false) {
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 200) {
      setError("Question count must be a whole number from 1 to 200.");
      return;
    }
    if (questionCount < quiz.questions.length && !confirmed) { setConfirmResize(true); return; }
    const questions = quiz.questions.slice(0, questionCount);
    while (questions.length < questionCount) questions.push(emptyQuestion());
    update("questions", questions);
    setQuestionIndex(Math.min(activeQuestion, questionCount - 1));
    setConfirmResize(false);
  }
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [validationMode, setValidationMode] = useState<boolean | null>(null);
  const [focusTarget, setFocusTarget] = useState("");
  const update = <K extends keyof QuizInput>(key: K, value: QuizInput[K]) => {
    setQuiz(previous => ({ ...previous, [key]: value }));
    setError("");
    setNotice("");
  };
  const readiness = getQuizIssues(quiz, true);
  const visibleIssues = validationMode !== null ? getQuizIssues(quiz, validationMode) : step === 3 ? readiness : [];
  useEffect(() => {
    if (focusTarget) document.getElementById(focusTarget)?.focus();
  }, [focusTarget, step, activeQuestion]);
  useEffect(() => {
    if (step === 1) document.getElementById("editor-question-tab-" + activeQuestion)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeQuestion, step]);
  function selectQuestion(index: number, focusTab = false) {
    setQuestionIndex(index);
    setFocusTarget("");
    setPreview(false);
    if (focusTab) document.getElementById("editor-question-tab-" + index)?.focus();
  }
  function fixIssue(issue: QuizIssue) {
    const question = issue.path.match(/^questions\.(\d+)/);
    if (question) setQuestionIndex(Number(question[1]));
    setStep(issue.step);
    setPreview(false);
    setFocusTarget(quizFieldId(issue.path));
    if (step === issue.step) document.getElementById(quizFieldId(issue.path))?.focus();
  }
  function fieldProps(path: string) {
    const invalid = visibleIssues.some(issue => issue.path === path);
    return { id: quizFieldId(path), "aria-invalid": invalid || undefined, "aria-describedby": invalid ? quizFieldId(path) + "-error" : undefined };
  }
  function fieldError(path: string) {
    const issue = visibleIssues.find(issue => issue.path === path);
    return issue ? <span className="field-error" id={quizFieldId(path) + "-error"}>{issue.message}</span> : null;
  }
  function continueStep() {
    if (step === 0 && quiz.questions.length === 0) {
      if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 200) {
        setError("Question count must be a whole number from 1 to 200.");
        return;
      }
      prepareQuestions();
    }
    const blocking = getQuizIssues(quiz, true).filter(issue => issue.step === step);
    if (blocking.length) {
      setValidationMode(true);
      fixIssue(blocking[0]);
      return;
    }
    setStep(step + 1);
    setPreview(false);
  }
  const marks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

  function move(index: number, direction: number) {
    const questions = [...quiz.questions];
    [questions[index], questions[index + direction]] = [questions[index + direction], questions[index]];
    update("questions", questions);
    setQuestionIndex(index + direction);
  }

  async function persist(publish: boolean) {
    setError("");
    setNotice("");
    setValidationMode(publish);
    const issues = getQuizIssues(quiz, publish);
    if (issues.length) {
      setError(publish ? "This quiz is not ready to publish. Fix the items below." : "Fix the items below before saving the draft.");
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
      setError("The server did not confirm the save. Check your connection, keep this page open, and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="quiz-studio">
    <header className="studio-heading"><Link href="/admin/quizzes">← Quiz library</Link><h1>{id ? quiz.title : "Create a quiz"}</h1>
      <p className="muted">Turn your next lesson into a great challenge.</p><span className="studio-heading-tag"><Sparkles size={15} /> Quiz creation studio</span></header>
    <nav className="studio-steps" aria-label="Quiz setup">{steps.map((label, i) => {
      const Icon = stepIcons[i];
      return <button key={label} className={"studio-step studio-step-" + i + (step === i ? " studio-step-active" : "")}
        aria-current={step === i ? "step" : undefined} onClick={() => { setStep(i); setPreview(false); }}>
        <span className="studio-step-icon"><Icon size={21} /></span><span><small>STEP {i + 1}</small><strong>{label}</strong><em>{stepHints[i]}</em></span>
      </button>;
    })}</nav>
    {locked && <p className="notice">This quiz has attempts. Its questions and settings are locked.</p>}
    {publishedCode && savedId && <Link className="button" href={"/admin/quizzes/" + savedId + "/leaderboard"}>Results and leaderboard</Link>}
    <div className="studio-layout"><div className="studio-main">
    {visibleIssues.length > 0 && <section className="studio-errors" role="alert" aria-label="Quiz validation problems">
      <h3><AlertCircle size={19} /> {visibleIssues.length} {visibleIssues.length === 1 ? "item needs" : "items need"} attention</h3>
      <ul>{visibleIssues.map((issue, index) => <li key={issue.path + index}><div><strong>{issue.label}</strong><p>{issue.message}</p></div><button onClick={() => fixIssue(issue)}>Fix <ArrowRight size={14} /></button></li>)}</ul>
    </section>}
    {error && <p role="alert" className="error">{error}</p>}
    <motion.section key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={"card stack studio-panel studio-panel-" + step}>
      <div className="row between wrap"><div><p className="eyebrow">Step {step + 1} of 4</p><h2>{steps[step]}</h2></div><span className="badge">{Math.round((step + 1) / 4 * 100)}% through setup</span></div>
      <progress aria-label="Quiz setup progress" value={step + 1} max={4} />
      {step === 1 && quiz.questions.length > 0 && <section className="question-navigator stack" aria-label="Question navigation">
        <div className="row between wrap">
          <div><strong>Question {activeQuestion + 1} of {quiz.questions.length}</strong><p className="muted">Switch tabs to edit any question.</p></div>
          <form className="question-jump row" onSubmit={event => {
            event.preventDefault();
            const target = Number(new FormData(event.currentTarget).get("question"));
            if (Number.isInteger(target) && target >= 1 && target <= quiz.questions.length) selectQuestion(target - 1, true);
            else setError("Choose a question number from 1 to " + quiz.questions.length + ".");
          }}>
            <label htmlFor="editor-question-jump">Jump to<input id="editor-question-jump" name="question" type="number" min={1} max={quiz.questions.length} defaultValue={1} required disabled={busy} /></label>
            <button type="submit" disabled={busy}>Go</button>
          </form>
        </div>
        <div className="question-tabs" role="tablist" aria-label="Quiz questions" aria-orientation="horizontal" onKeyDown={event => {
          let target = activeQuestion;
          if (event.key === "ArrowRight") target = (activeQuestion + 1) % quiz.questions.length;
          else if (event.key === "ArrowLeft") target = (activeQuestion - 1 + quiz.questions.length) % quiz.questions.length;
          else if (event.key === "Home") target = 0;
          else if (event.key === "End") target = quiz.questions.length - 1;
          else return;
          event.preventDefault();
          selectQuestion(target, true);
        }}>
          {quiz.questions.map((question, index) => {
            const incomplete = readiness.some(issue => issue.path.startsWith("questions." + index + "."));
            return <button type="button" role="tab" key={index} id={"editor-question-tab-" + index}
              aria-selected={activeQuestion === index} aria-controls={"editor-question-panel-" + index}
              aria-label={"Question " + (index + 1) + ", " + questionTypes[question.type] + (incomplete ? ", needs attention" : ", complete")}
              tabIndex={activeQuestion === index ? 0 : -1} disabled={busy} title={(question.text || "Question " + (index + 1)).slice(0, 100)}
              className={"question-tab " + (activeQuestion === index ? "question-tab-active" : "")}
              onClick={() => selectQuestion(index)}><span>Q{index + 1}</span>
              {incomplete ? <span className="question-tab-dot" aria-hidden="true" /> : <CheckCircle2 size={12} aria-hidden="true" />}
            </button>;
          })}
        </div>
        <div className="question-nav-footer row between wrap">
          <span className="muted">An amber dot marks a question that needs attention.</span>
          <div className="row"><button type="button" disabled={busy || activeQuestion === 0} onClick={() => selectQuestion(activeQuestion - 1)}>← Previous</button>
            <button type="button" disabled={busy || activeQuestion === quiz.questions.length - 1} onClick={() => selectQuestion(activeQuestion + 1)}>Next →</button></div>
        </div>
      </section>}
      <fieldset disabled={locked || busy} className="stack">
        {step === 0 && <>
          <div className="field-grid">
            <label>Quiz title<input {...fieldProps("title")} required placeholder="Give your quiz a memorable name" value={quiz.title} onChange={e => update("title", e.target.value)} />{fieldError("title")}</label>
            <div className="studio-field"><label htmlFor={quizFieldId("course")}>Subject</label>
              <SubjectPicker {...fieldProps("course")} value={quiz.course} subjects={subjects} onChange={value => update("course", value)} />{fieldError("course")}
            </div>
            <label>Semester<input {...fieldProps("semester")} required placeholder="e.g. 3" value={quiz.semester} onChange={e => update("semester", e.target.value)} />{fieldError("semester")}</label>
            <label>Duration (minutes)<input {...fieldProps("durationMinutes")} type="number" min={1} max={360} value={quiz.durationMinutes} onChange={e => update("durationMinutes", Number(e.target.value))} />{fieldError("durationMinutes")}</label>
            <label>Total marks<input {...fieldProps("totalMarks")} type="number" min={1} value={quiz.totalMarks} onChange={e => update("totalMarks", Number(e.target.value))} />{fieldError("totalMarks")}</label>
          </div>
          <section className="question-plan stack">
            <div><h3>Plan your questions</h3><p className="muted">Choose a format and prepare your question cards.</p></div>
            <div className="question-format-grid">{([
              ["MCQ", "Multiple choice", "Four options, one correct answer"],
              ["BLANK", "Fill in the blanks", "Short answers, automatically graded"],
              ["THEORY", "Theory / written", "Written answers, graded by you"],
              ["MIXED", "Mixed formats", "Choose the type for each question"],
            ] as const).map(([value, title, description]) => <button type="button" key={value}
              className={"question-format format-" + value.toLowerCase() + (format === value ? " format-selected" : "")}
              aria-pressed={format === value} onClick={() => setFormat(value)}><strong>{title}</strong><small>{description}</small>{format === value && <CheckCircle2 size={16} />}</button>)}</div>
            <div className="row wrap"><label>How many questions?<input type="number" min={1} max={200} value={questionCount} onChange={event => { setQuestionCount(Number(event.target.value)); setConfirmResize(false); }} /></label>
              <button type="button" onClick={() => prepareQuestions()}>Prepare {questionCount || "your"} questions</button>
            </div>
            <p className="muted">Existing questions are preserved when adding more. Change a question’s type in the Questions step.</p>
            {confirmResize && <div className="notice stack"><p>This will remove the last {quiz.questions.length - questionCount} question cards from this unsaved quiz.</p>
              <div className="row"><button onClick={() => setConfirmResize(false)}>Cancel</button><button onClick={() => prepareQuestions(true)}>Confirm question count</button></div>
            </div>}
          </section>
          <label>Description <span className="studio-optional">Optional · What does this quiz cover?</span><textarea {...fieldProps("description")} placeholder="Topics, lab manuals, or learning outcomes covered by this quiz…" value={quiz.description} onChange={e => update("description", e.target.value)} />{fieldError("description")}</label>
          <label>Student instructions <span className="studio-optional">Optional · What should students know before starting?</span><textarea {...fieldProps("instructions")} placeholder="Explain identity requirements, quiz rules, and how to submit…" value={quiz.instructions} onChange={e => update("instructions", e.target.value)} />{fieldError("instructions")}</label>
        </>}
        {step === 1 && <>
          <div className="studio-question-banner"><span><ListChecks size={20} /> {quiz.questions.length} questions</span><strong>{marks} / {quiz.totalMarks} marks assigned</strong></div>
          {quiz.questions.map((q, index) => {
            if (index !== activeQuestion) return <div hidden role="tabpanel" id={"editor-question-panel-" + index} aria-labelledby={"editor-question-tab-" + index} key={index} />;
            function change(fields: Partial<typeof q>) {
              update("questions", quiz.questions.map((item, i) => i === index ? { ...item, ...fields } : item));
            }
            return <article className="question-editor stack question-editor-panel" key={index} role="tabpanel" id={"editor-question-panel-" + index} aria-labelledby={"editor-question-tab-" + index}>
              <div className="row between wrap"><h3>Question {index + 1}</h3><div className="row">
                <button aria-label="Move question up" disabled={!index} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
                <button aria-label="Move question down" disabled={index === quiz.questions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
                <button aria-label="Delete question" onClick={() => { update("questions", quiz.questions.filter((_, i) => i !== index)); setQuestionIndex(Math.max(0, Math.min(index, quiz.questions.length - 2))); setFocusTarget(""); }}><Trash2 size={16} /></button>
              </div></div>
              <div className="question-kind-switch" role="group" aria-label={"Question " + (index + 1) + " format"}>
                {Object.entries(questionTypes).map(([value, label]) => <button type="button" key={value}
                  className={q.type === value ? "selected" : ""} aria-pressed={q.type === value}
                  onClick={() => change({ type: value as "MCQ" | "BLANK" | "THEORY" })}>{label}</button>)}
              </div>
              <label>Question text<textarea {...fieldProps(`questions.${index}.text`)} placeholder="Write your question here…" value={q.text} onChange={e => change({ text: e.target.value })} />{fieldError(`questions.${index}.text`)}</label>
              {q.type === "MCQ" && <div className="field-grid answer-choice-grid" role="group" aria-label="Answer options and correct answer">{q.options.map((option, i) => <div className={"option-editor choice-card option-" + i + (q.correct === i ? " choice-card-correct" : "")} key={i}>
                <label>Option {String.fromCharCode(65 + i)}<input {...fieldProps(`questions.${index}.options.${i}`)} value={option} onChange={e => change({ options: q.options.map((text, j) => j === i ? e.target.value : text) })} />{fieldError(`questions.${index}.options.${i}`)}</label>
                <button type="button" className={"choice-correct-button " + (q.correct === i ? "choice-correct-selected" : "")}
                  id={i === 0 ? quizFieldId(`questions.${index}.correct`) : undefined}
                  aria-pressed={q.correct === i} aria-label={"Set option " + String.fromCharCode(65 + i) + " as the correct answer"}
                  onClick={() => change({ correct: i })}>{q.correct === i ? <CheckCircle2 size={17} /> : <span className="choice-correct-placeholder" aria-hidden="true" />}
                  {q.correct === i ? "Correct answer" : "Mark as correct"}</button>
              </div>)}</div>}
              {q.type === "BLANK" && <label>Accepted answers<textarea {...fieldProps(`questions.${index}.acceptedAnswers`)} placeholder="One accepted answer per line" value={q.acceptedAnswers.join("\n")} onChange={event => change({ acceptedAnswers: event.target.value.split("\n") })} />
                <span className="studio-optional">Case and extra spaces are ignored. Enter a complete accepted answer on each line.</span>{fieldError(`questions.${index}.acceptedAnswers`)}</label>}
              {q.type === "THEORY" && <p className="notice">Students type a written answer. Review it in Results and award marks before final scores appear.</p>}
              <label>Question time (seconds, optional)<input {...fieldProps(`questions.${index}.durationSeconds`)} type="number" min={1} max={21600} placeholder="e.g. 60" value={q.durationSeconds ?? ""} onChange={e => change({ durationSeconds: e.target.value ? Number(e.target.value) : null })} /><span className="studio-optional">Answers lock when time runs out and students move to the next question.</span>{fieldError(`questions.${index}.durationSeconds`)}</label>
              <label>Marks<input {...fieldProps(`questions.${index}.marks`)} type="number" min={1} max={1000} value={q.marks} onChange={e => change({ marks: Number(e.target.value) })} />{fieldError(`questions.${index}.marks`)}</label>
            </article>;
          })}
          <button id={quizFieldId("questions")} onClick={() => { update("questions", [...quiz.questions, emptyQuestion()]); selectQuestion(quiz.questions.length); }} disabled={quiz.questions.length >= 200}><Plus size={17} /> Add question</button>
        </>}
        {step === 2 && <QuizSettings value={quiz} onChange={update} />}
        {step === 3 && <>
          <div className="publish-hero">
            <span className="publish-hero-icon"><Rocket size={30} /></span>
            <div><span className="publish-eyebrow">YOUR NEXT CLASS CHALLENGE</span><h3>{quiz.title || "Untitled quiz"}</h3><p>{quiz.course || "Choose a subject"} · Semester {quiz.semester || "—"}</p></div>
            <div className="publish-facts"><span><ListChecks size={16} /> {quiz.questions.length} questions</span><span><Clock size={16} /> {quiz.durationMinutes} minutes</span><span><Sparkles size={16} /> {marks} / {quiz.totalMarks} marks</span></div>
          </div>
          <div className="publish-schedule-grid">
          <section className="publish-schedule publish-schedule-open" aria-labelledby="publish-opening-title">
          <div className="publish-section-title"><span><CalendarClock size={23} /></span><div><span className="publish-eyebrow">LET STUDENTS IN</span><h3 id="publish-opening-title">Choose your opening time</h3></div></div>
          <div className="publish-presets" role="group" aria-label="Opening time shortcuts">
            <button type="button" aria-pressed={!quiz.opensAt} onClick={() => update("opensAt", null)}><Rocket size={15} /> On publish</button>
            <button type="button" onClick={() => update("opensAt", new Date(Math.ceil((Date.now() + 600000) / 60000) * 60000).toISOString())}><Clock size={15} /> In 10 minutes</button>
          </div>
          <label>Quiz opening time (PKT)
            <input {...fieldProps("opensAt")} type="datetime-local" value={quiz.opensAt ? pakistanInputValue(quiz.opensAt) : ""} onChange={e => {
              const value = e.target.value;
              const timestamp = Date.parse(value + "+05:00");
              update("opensAt", Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null);
            }} />
          </label>
          {fieldError("opensAt")}
          <p className="publish-schedule-note"><Clock size={16} /><span>{quiz.opensAt ? "Opens " + formatQuizOpening(Date.parse(quiz.opensAt)) + ". Students see a countdown until then." : "Students can join as soon as you publish."}</span></p>
          </section>
          <section className="publish-schedule publish-schedule-close" aria-labelledby="publish-expiration-title">
          <div className="publish-section-title"><span><Flag size={23} /></span><div><span className="publish-eyebrow">SET THE FINISH LINE</span><h3 id="publish-expiration-title">Control link availability</h3></div></div>
          <div className="publish-presets" role="group" aria-label="Link expiration shortcuts">
            <button type="button" aria-pressed={!quiz.expiresAt} onClick={() => update("expiresAt", null)}>Close manually</button>
            <button type="button" onClick={() => update("expiresAt", new Date(Math.ceil((Math.max(Date.now(), quiz.opensAt ? Date.parse(quiz.opensAt) : 0) + 3600000) / 60000) * 60000).toISOString())}><Clock size={15} /> 1 hour after opening</button>
          </div>
          <label>Link expiration (PKT, optional)
            <input {...fieldProps("expiresAt")} type="datetime-local" value={quiz.expiresAt ? pakistanInputValue(quiz.expiresAt) : ""} onChange={e => {
              const timestamp = Date.parse(e.target.value + "+05:00");
              update("expiresAt", Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null);
            }} />
          </label>
          <p className="publish-schedule-note"><ShieldCheck size={16} /><span>{quiz.expiresAt
            ? "The link stops accepting new attempts at " + formatQuizOpening(Date.parse(quiz.expiresAt)) + "."
            : "The link stays open until you close it manually."}</span></p>
          {fieldError("expiresAt")}
          </section>
          </div>
          <section className="publish-rules" aria-labelledby="publish-rules-title">
            <div className="row between wrap"><div className="publish-section-title"><span><ShieldCheck size={23} /></span><div><span className="publish-eyebrow">ONE LAST LOOK</span><h3 id="publish-rules-title">Your quiz rules</h3></div></div><button type="button" onClick={() => setStep(2)}>Edit settings <ArrowRight size={15} /></button></div>
            <div className="publish-result-policy"><Eye size={20} /><div><strong>{quiz.showResults ? "Scores shown after each attempt" : "You choose when results go live"}</strong><p>{quiz.showResults ? "Students receive their results automatically." : "Release scores when you are ready from the quiz controls."}{quiz.questions.some(q => q.type === "THEORY") && " Written answers need grading before final scores appear."}</p></div></div>
            <div className="publish-rule-tags">{Object.entries(settings).filter(([key]) => quiz[key as keyof typeof settings] && (key !== "terminateOnTabSwitch" || quiz.detectTabSwitch)).map(([key, label], index) => <span key={key} className={"publish-rule-tag publish-rule-tag-" + index % 4}><Check size={14} />{label}</span>)}</div>
          </section>
          <div className="publish-launch">
            <div><span className="publish-eyebrow">{readiness.length ? "A FEW DETAILS TO CHECK" : "READY FOR YOUR CLASS"}</span><h3>{readiness.length ? "Review before takeoff" : quiz.opensAt ? "Your quiz is ready to schedule" : "Let the learning begin"}</h3><p>{readiness.length ? "Use the publish readiness panel to find what needs attention." : "Publish to get the student link and share it with your class."}</p></div>
            <div className="publish-launch-actions"><button type="button" onClick={() => void persist(false)}><Save size={17} />{publishedCode ? "Unpublish and save draft" : "Save as draft"}</button>
            <button type="button" className="primary" onClick={() => void persist(true)}><Rocket size={18} />{busy ? "Saving…" : publishedCode ? "Update published quiz" : quiz.opensAt ? "Schedule & publish" : "Publish quiz"}</button></div>
          </div>
        </>}
      </fieldset>
      {(step === 1 || step === 3) && <button className={step === 3 ? "publish-preview-button" : ""} aria-expanded={preview} onClick={() => setPreview(!preview)}><Eye size={17} />{preview ? "Close preview" : "Preview quiz"}</button>}
      {preview && <div className="notice stack">{quiz.questions.length ? quiz.questions.map((q, i) => step === 1 && i !== activeQuestion ? null : <div key={i}>
        <strong>{i + 1}. {q.text}</strong><p className="muted">{questionTypes[q.type]}</p>{q.type === "MCQ" ? <ol type="A">{q.options.map((text, index) => <li key={index}>{text}</li>)}</ol> : <p className="notice">{q.type === "BLANK" ? "Student enters a short answer" : "Student writes an explanation"}</p>}
      </div>) : <p>Add questions to see a preview.</p>}</div>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {step === 3 && publishedCode && <CopyLink code={publishedCode} />}
      <div className="row between"><button disabled={step === 0} onClick={() => { setStep(step - 1); setPreview(false); }}>Back</button>
        {step < 3 && <button className="primary" onClick={continueStep}>Continue <ArrowRight size={16} /></button>}</div>
    </motion.section>
    </div>
    <aside className="studio-summary">
      <div className="studio-summary-top"><BookOpen size={24} /><span>YOUR QUIZ AT A GLANCE</span></div>
      <h3>{quiz.title || "Your next great quiz"}</h3><p className="muted">{quiz.course || "Choose a subject"}{quiz.semester && " · Semester " + quiz.semester}</p>
      <div className="studio-mini-stats"><div><ListChecks size={18} /><strong>{quiz.questions.length}</strong><span>questions</span></div><div><Clock size={18} /><strong>{quiz.durationMinutes || "—"}</strong><span>minutes</span></div></div>
      <div className={"studio-marks " + (marks === quiz.totalMarks && marks > 0 ? "studio-marks-ready" : "")}><span>Assigned marks</span><strong>{marks} / {quiz.totalMarks || "—"}</strong>
        <progress aria-label="Marks assigned" value={Math.min(marks, quiz.totalMarks || 1)} max={quiz.totalMarks || 1} />
        <small>{marks === quiz.totalMarks && marks > 0 ? "All marks accounted for" : "Question marks must match the quiz total"}</small>
        {!locked && marks > 0 && marks !== quiz.totalMarks && <button disabled={busy} onClick={() => update("totalMarks", marks)}>Set total to {marks}</button>}
      </div>
      <div className="studio-readiness"><h3>Publish readiness</h3>{steps.map((label, i) => {
        const count = readiness.filter(issue => issue.step === i).length;
        return <button key={label} onClick={() => { setStep(i); setValidationMode(true); }}><span className={count ? "readiness-pending" : "readiness-ready"}>{count ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}</span><span>{label}</span><small>{count ? count + " to fix" : "Ready"}</small></button>;
      })}</div>
      {readiness.length === 0 && <p className="studio-ready-message"><Check size={17} /> Ready to share with your class</p>}
    </aside>
    </div>
  </div>;
}

