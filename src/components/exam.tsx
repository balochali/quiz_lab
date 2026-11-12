"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { CodeContent } from "./code-content";
import { motion } from "framer-motion";
import type { studentState } from "@/lib/attempt";

type State = NonNullable<Awaited<ReturnType<typeof studentState>>>;
type JoinQuiz = {
  code: string; title: string; course: string; durationMinutes: number; instructions: string; description: string;
  requireFullscreen: boolean; detectTabSwitch: boolean; terminateOnTabSwitch: boolean; _count: { questions: number };
};
type Event = "SUBMIT" | "TIME" | "BLUR" | "TAB_SWITCH" | "FULLSCREEN_EXIT";

export function Exam({ quiz, initial }: { quiz?: JoinQuiz; initial?: Extract<State, { phase: "active" }> }) {
  const [attempt, setAttempt] = useState(initial);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState(initial?.answers ?? {});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [stopped, setStopped] = useState<Event | null>(null);
  const [clock, setClock] = useState(Date.now);
  const [offset, setOffset] = useState(() => initial ? initial.serverNow - Date.now() : 0);
  const [questionDeadlines, setQuestionDeadlines] = useState<Record<string, number>>({});
  const visibleQuestionId = attempt?.questions[position]?.id;
  useEffect(() => {
    if (!attempt || !ready || !visibleQuestionId) return;
    let cancelled = false;
    void fetch("/api/attempt/" + attempt.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "QUESTION_OPEN", questionId: visibleQuestionId }) }).then(async response => {
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (!cancelled && result.deadline) {
        setQuestionDeadlines(previous => ({ ...previous, [visibleQuestionId]: result.deadline }));
        setOffset(result.serverNow - Date.now());
      }
    }).catch(() => { if (!cancelled) setError("Unable to start question timer. Check your connection and reopen the question."); });
    return () => { cancelled = true; };
  }, [attempt, ready, visibleQuestionId]);
  useEffect(() => {
    if (!attempt || !ready || !visibleQuestionId || !questionDeadlines[visibleQuestionId] || clock + offset < questionDeadlines[visibleQuestionId]) return;
    const advance = window.setTimeout(() => setPosition(current => {
      for (let next = current + 1; next < attempt.questions.length; next++) {
        if (!questionDeadlines[attempt.questions[next].id] || questionDeadlines[attempt.questions[next].id] > clock + offset) return next;
      }
      return current;
    }), 0);
    return () => window.clearTimeout(advance);
  }, [attempt, ready, visibleQuestionId, questionDeadlines, clock, offset]);
  const ending = useRef(false);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const requestInFlight = useRef(false);
  const deferredText = useRef<{ questionId: string; value: string } | null>(null);
  const failedAnswers = useRef(new Map<string, { value: string; text: boolean }>());
  const textTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writes = useRef(0);
  const answerVersions = useRef(new Map<string, number>());
  const queueAnswer = useCallback((questionId: string, value: string, text: boolean) => {
    if (!attempt) return Promise.resolve();
    const version = (answerVersions.current.get(questionId) ?? 0) + 1;
    answerVersions.current.set(questionId, version);
    failedAnswers.current.delete(questionId);
    writes.current++;
    setBusy(true);
    pending.current = pending.current.then(async () => {
      try {
        const response = await fetch("/api/attempt/" + attempt.id, {
          method: "POST", body: JSON.stringify({ type: "ANSWER", questionId, ...(text ? { textAnswer: value } : { optionId: value }) }),
          headers: { "Content-Type": "application/json" }, keepalive: true,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (result.status !== "IN_PROGRESS") window.location.replace("/quiz/" + attempt.id + "/result");
        else {
          if (!text) setAnswers(previous => ({ ...previous, [questionId]: value }));
          if (answerVersions.current.get(questionId) === version) failedAnswers.current.delete(questionId);
          if (!failedAnswers.current.size) setError("");
        }
      } catch {
        if (answerVersions.current.get(questionId) === version) {
          failedAnswers.current.set(questionId, { value, text });
          setError("Answer was not confirmed. Check your connection and use Save answer to retry.");
        }
      } finally {
        writes.current--;
        setBusy(writes.current > 0 || deferredText.current !== null);
      }
    });
    return pending.current;
  }, [attempt]);
  const flushText = useCallback(() => {
    if (textTimer.current) clearTimeout(textTimer.current);
    const draft = deferredText.current;
    deferredText.current = null;
    if (draft) void queueAnswer(draft.questionId, draft.value, true);
    for (const [questionId, failed] of failedAnswers.current) {
      if (questionId !== draft?.questionId) void queueAnswer(questionId, failed.value, failed.text);
    }
    return pending.current;
  }, [queueAnswer]);
  useEffect(() => {
    function saveBeforeLeaving() { void flushText(); }
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => {
      window.removeEventListener("pagehide", saveBeforeLeaving);
      if (textTimer.current) clearTimeout(textTimer.current);
    };
  }, [flushText]);
  const remaining = attempt ? Math.max(0, Math.ceil((attempt.endsAt - clock - offset) / 1000)) : 0;

  const send = useCallback(async (type: Event, terminal = false) => {
    if (!attempt || (ending.current && !terminal) || (terminal && requestInFlight.current)) return;
    if (terminal) {
      ending.current = true;
      requestInFlight.current = true;
      if (type === "TAB_SWITCH" || type === "FULLSCREEN_EXIT") {
        try { sessionStorage.setItem("quiz-event-" + attempt.id, type); } catch { /* Storage can be unavailable in restricted browsers. */ }
      }
    }
    try {
      if (type === "SUBMIT" || type === "TIME") {
        await flushText();
        if (failedAnswers.current.size) throw new Error("Pending answer was not saved");
      } else if (terminal) void flushText();
      const response = await fetch("/api/attempt/" + attempt.id, {
        method: "POST", body: JSON.stringify({ type }), headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.status !== "IN_PROGRESS") {
        ending.current = true;
        try { sessionStorage.removeItem("quiz-event-" + attempt.id); } catch { /* Storage can be unavailable in restricted browsers. */ }
        window.location.replace("/quiz/" + attempt.id + "/result");
      } else if (terminal) {
        ending.current = false;
        setStopped(null);
      }
    } catch {
      setError("Could not reach the server. Check your connection and retry.");
      if (terminal) setStopped(type);
    } finally {
      if (terminal) requestInFlight.current = false;
    }
  }, [attempt, flushText]);

  useEffect(() => {
    if (!attempt?.policy || !ready) return;
    const policy = attempt.policy;
    function end(type: Event) {
      if (ending.current) return;
      ending.current = true;
      setStopped(type);
      void send(type, true);
    }
    function visibility() {
      if (!document.hidden || !policy.detectTabSwitch) return;
      if (policy.terminateOnTabSwitch) end("TAB_SWITCH");
      else void send("TAB_SWITCH");
    }
    function fullscreen() {
      if (!document.fullscreenElement && policy.requireFullscreen) end("FULLSCREEN_EXIT");
    }
    function blur() { void send("BLUR"); }
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("blur", blur);
    visibility();
    fullscreen();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
    };
  }, [attempt, ready, send]);

  useEffect(() => {
    if (!attempt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [attempt, flushText]);

  useEffect(() => {
    if (!attempt?.policy || remaining > 0 || ending.current || !attempt.policy.autoSubmit) return;
    void send("TIME", true);
  }, [attempt, remaining, send]);

  async function begin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const data = event ? Object.fromEntries(new FormData(event.currentTarget)) : null;
    if (attempt) {
      let previousEvent: string | null = null;
      try { previousEvent = sessionStorage.getItem("quiz-event-" + attempt.id); } catch { /* Storage can be unavailable in restricted browsers. */ }
      if (previousEvent === "TAB_SWITCH" || previousEvent === "FULLSCREEN_EXIT") {
        setStopped(previousEvent);
        void send(previousEvent, true);
        return;
      }
    }
    setError("");
    setBusy(true);
    try {
      if ((quiz?.requireFullscreen || attempt?.policy?.requireFullscreen) && !document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen) throw new Error("Use a browser that supports fullscreen.");
        try { await document.documentElement.requestFullscreen(); }
        catch { throw new Error("Fullscreen is required. Enable fullscreen and try again."); }
      }
      if (quiz && data) {
        const response = await fetch("/api/join/" + quiz.code, { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        const stateResponse = await fetch("/api/attempt/" + result.id, { cache: "no-store" });
        if (!stateResponse.ok) {
          window.location.replace("/quiz/" + result.id);
          return;
        }
        const state: State = await stateResponse.json();
        if (state.phase === "closed") {
          window.location.replace("/quiz/" + result.id + "/result");
          return;
        }
        window.history.replaceState(null, "", "/quiz/" + result.id);
        setAttempt(state);
        setAnswers(state.answers ?? {});
        setOffset(state.serverNow - Date.now());
        setClock(Date.now());
      }
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the quiz.");
      if (document.fullscreenElement && !attempt) await document.exitFullscreen().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  function choose(questionId: string, optionId: string) {
    if (!attempt || ending.current || busy) return;
    void queueAnswer(questionId, optionId, false);
  }
  function typeAnswer(questionId: string, value: string) {
    if (ending.current) return;
    setAnswers(previous => ({ ...previous, [questionId]: value }));
    deferredText.current = { questionId, value };
    setBusy(true);
    if (textTimer.current) clearTimeout(textTimer.current);
    textTimer.current = setTimeout(() => void flushText(), 500);
  }

  if (!attempt && quiz) return <main className="narrow card">
    <p className="eyebrow"><ShieldCheck size={17} /> Student assessment</p>
    <h1>{quiz.title}</h1><p>{quiz.course} · {quiz.durationMinutes} min · {quiz._count.questions} questions</p>
    <p className="multiline">{quiz.description}</p>
    <aside className="notice"><strong>Before you start</strong><p className="multiline">{quiz.instructions}</p>
      {quiz.requireFullscreen && <p>Exiting fullscreen ends your attempt.</p>}
      {quiz.detectTabSwitch && quiz.terminateOnTabSwitch && <p>Switching tabs ends your attempt.</p>}
    </aside>
    <form onSubmit={begin} className="stack">
      <label>Full name<input name="name" required maxLength={150} /></label>
      <label>Roll number<input name="rollNumber" required maxLength={80} /></label>
      <label>Semester number<input name="semester" type="text" inputMode="numeric" pattern="([1-9]|1[0-9]|20)" required maxLength={2} placeholder="e.g. 3 or 6" title="Enter only a semester number from 1 to 20." onInput={event => { event.currentTarget.value = event.currentTarget.value.replace(/[^0-9]/g, ""); }} /><span className="studio-optional">Numbers only, for example 3 or 6. No need to type “semester”.</span></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={busy} className="primary">{busy ? "Starting…" : "Start quiz"} <ArrowRight size={18} /></button>
    </form>
  </main>;

  if (!attempt) return null;
  if (stopped || remaining === 0) return <main className="narrow card">
    <h1>{stopped === "TAB_SWITCH" ? "Tab switch detected" : stopped === "FULLSCREEN_EXIT" ? "Fullscreen exited" : stopped === "SUBMIT" ? "Submitting your quiz" : "Time is up"}</h1>
    <p>{error || "Your attempt is closed for further answers."}</p>
    <button className="primary" onClick={() => void send(stopped ?? "TIME", true)}>View result</button>
  </main>;
  if (!ready) return <main className="narrow card"><h1>{attempt.title}</h1><p>Your saved answers are available. The original timer is still running.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <button className="primary" disabled={busy} onClick={() => void begin()}>Resume quiz</button>
  </main>;

  const questions = attempt.questions ?? [];
  const question = questions[position];
  if (!question) return null;
  const questionLocked = !!question.durationSeconds && (!questionDeadlines[question.id] || clock + offset >= questionDeadlines[question.id]);
  const completed = Object.values(answers).filter(value => !!value.trim()).length;
  const questionSeconds = question.durationSeconds && questionDeadlines[question.id] ? Math.max(0, Math.ceil((questionDeadlines[question.id] - clock - offset) / 1000)) : question.durationSeconds;
  return <main className="exam exam-colorful">
    <div className="row between"><div><p className="eyebrow">Live assessment</p><h1>{attempt.title}</h1></div>
      <div className={remaining < 60 ? "timer urgent" : "timer"}><Clock size={18} />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</div>
    </div>
    <progress value={completed} max={questions.length} aria-label="Questions answered" />
    <p className="muted">{completed} of {questions.length} answered {busy && " · Saving…"}</p>
    <nav className="row wrap" aria-label="Questions">{questions.map((q, index) => <button key={q.id}
      className={index === position ? "primary" : answers[q.id] ? "selected" : ""}
      aria-current={index === position ? "step" : undefined} onClick={() => setPosition(index)}>{index + 1}</button>)}</nav>
    <motion.section key={question.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card stack">
      <p className="eyebrow">Question {position + 1} of {questions.length} · {question.marks} marks</p>
      {questionSeconds != null && <div className={"question-countdown " + (questionSeconds === 0 ? "question-countdown-warning" : "")} role="status"><Clock size={20} /><strong>Question timer: {Math.floor(questionSeconds / 60)}:{String(questionSeconds % 60).padStart(2, "0")}</strong><span>{questionSeconds === 0 ? "Time is up. This answer is locked." : "Answers lock at zero. The timer continues when you leave this question."}</span></div>}
      <h2 className="multiline"><CodeContent text={question.text} /></h2>
      {question.type === "MCQ" && question.options.map((option, index) => <button key={option.id} disabled={busy || questionLocked} aria-pressed={answers[question.id] === option.id}
        className={"option " + (answers[question.id] === option.id ? "selected" : "")} onClick={() => choose(question.id, option.id)}>
        <span>{String.fromCharCode(65 + index)}</span><CodeContent text={option.text} /></button>)}
      {question.type !== "MCQ" && <div className="stack">
        <label>Your answer
          {question.type === "THEORY" ? <textarea disabled={questionLocked} maxLength={12000} rows={8} value={answers[question.id] ?? ""} onChange={event => typeAnswer(question.id, event.target.value)} onBlur={() => void flushText()} /> :
            <input disabled={questionLocked} maxLength={12000} value={answers[question.id] ?? ""} onChange={event => typeAnswer(question.id, event.target.value)} onBlur={() => void flushText()} />}
        </label><div className="row wrap"><button onClick={() => void flushText()}>Save answer</button><span className="muted">{busy ? "Saving…" : "Answers save automatically"}</span></div>
        {question.type === "THEORY" && <p className="notice">Your lecturer will grade this written answer after submission.</p>}
      </div>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="row between wrap">
        <button disabled={position === 0} onClick={() => setPosition(position - 1)}><ArrowLeft size={17} /> Previous</button>
        <button disabled={position + 1 === questions.length} onClick={() => setPosition(position + 1)}>Next <ArrowRight size={17} /></button>
        <button className="primary" disabled={busy} onClick={() => setConfirmSubmit(true)}>Submit quiz</button>
      </div>
      {confirmSubmit && <div className="notice stack" role="group" aria-label="Confirm submission">
        <p>Submit your quiz? You cannot change answers afterward.</p>
        <div className="row wrap">
          <button onClick={() => setConfirmSubmit(false)}>Keep working</button>
          <button className="primary" disabled={busy} onClick={() => {
            setStopped("SUBMIT");
            void send("SUBMIT", true);
          }}>Confirm submission</button>
        </div>
      </div>}
    </motion.section>
  </main>;
}







