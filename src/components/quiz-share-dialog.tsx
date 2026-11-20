"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Link2, X } from "lucide-react";
import { CopyLink } from "./copy-link";

export function QuizShareDialog({ code, title, open, onClose }: { code: string; title: string; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      if (input.current) input.current.value = new URL("/join/" + code, window.location.origin).href;
      if (!element.open) element.showModal();
    } else if (element.open) element.close();
  }, [open, code]);
  return <dialog ref={dialog} className="quiz-share-dialog" aria-labelledby="quiz-share-heading" aria-describedby="quiz-share-description" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <header className="quiz-share-header"><span className="quiz-share-success"><CheckCircle2 size={30} /></span><button type="button" onClick={() => dialog.current?.close()} aria-label="Close share dialog"><X size={20} /></button><p className="eyebrow">Ready for your class</p><h2 id="quiz-share-heading">Share your quiz</h2><p>{title || "Your published quiz"}</p></header>
    <div className="quiz-share-content stack"><p id="quiz-share-description">Send this link to your students. Access follows your published schedule and quiz settings.</p><label><span className="row"><Link2 size={16} /> Student quiz link</span><input ref={input} defaultValue={"/join/" + code} readOnly onFocus={event => event.currentTarget.select()} /></label><CopyLink code={code} /><button type="button" className="primary quiz-share-done" onClick={() => dialog.current?.close()}>Done</button></div>
  </dialog>;
}
