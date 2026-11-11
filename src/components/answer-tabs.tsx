"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function AnswerTabs({ children, states }: { children: ReactNode[]; states: string[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  if (!children.length) return <p>No questions to review.</p>;
  const labels: Record<string, string> = { correct: "Correct", incorrect: "Incorrect", partial: "Partial marks", pending: "Awaiting grading", unanswered: "Unanswered" };
  return <div className="answer-tabs-review">
    <div className="answer-tabs" role="tablist" aria-label="Student answers">{children.map((_, index) => <button key={index} id={`${id}-tab-${index}`} role="tab" type="button" aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} className={`answer-tab answer-review-${states[index]}`} onClick={() => setActive(index)} onKeyDown={event => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % children.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + children.length) % children.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = children.length - 1;
      else return;
      event.preventDefault(); setActive(next); document.getElementById(`${id}-tab-${next}`)?.focus();
    }}><span className="answer-tab-dot" aria-hidden="true" />Q{index + 1}<span className="sr-only"> · {labels[states[index]]}</span></button>)}</div>
    <div className="row between wrap answer-tab-navigation"><button type="button" disabled={active === 0} onClick={() => setActive(active - 1)}><ArrowLeft size={15} /> Previous</button><span>Question {active + 1} of {children.length}</span><button type="button" disabled={active === children.length - 1} onClick={() => setActive(active + 1)}>Next <ArrowRight size={15} /></button></div>
    {children.map((child, index) => <div role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} key={index} tabIndex={0}>{child}</div>)}
  </div>;
}
