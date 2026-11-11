"use client";

import { useState } from "react";
import Link from "next/link";
import { correctMarks } from "@/app/admin/correct-marks";

export function CorrectMarks({ quizId, questions }: {
  quizId: string; questions: { id: string; text: string; marks: number }[];
}) {
  const [questionId, setQuestionId] = useState(questions[0]?.id ?? "");
  const question = questions.find(q => q.id === questionId);
  const action = correctMarks.bind(null, quizId);
  return <section className="card stack">
    <div><p className="eyebrow">After-submission correction</p><h2>Correct question marks</h2></div>
    <p>Use this for an incorrect mark allocation. All saved attempts will be regraded and the quiz total will be recalculated.</p>
    <p><Link href={"/admin/quizzes/" + quizId + "/leaderboard"}>Close the student link first</Link>, then wait for any active attempts to finish.</p>
    <form action={action} className="stack">
      <label>Question<select name="questionId" value={questionId} onChange={event => setQuestionId(event.target.value)}>
        {questions.map((q, index) => <option value={q.id} key={q.id}>{index + 1}. {q.text} ({q.marks} marks)</option>)}
      </select></label>
      <input type="hidden" name="expectedMarks" value={question?.marks ?? ""} />
      <label>Correct marks<input key={questionId} name="marks" type="number" min={1} max={1000} defaultValue={question?.marks} required /></label>
      <label className="check"><input type="checkbox" name="confirmed" required /> I confirm this correction should update every saved result.</label>
      <button className="primary">Correct marks and regrade</button>
    </form>
  </section>;
}
