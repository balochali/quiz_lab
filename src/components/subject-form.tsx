"use client";

import { useActionState, useRef, useState } from "react";
import { BookOpen, Plus, Sparkles, X, ArrowUpRight } from "lucide-react";
import { addSubject } from "@/app/admin/(workspace)/subjects/actions";
import { subjectStyle } from "@/lib/subject-style";

function SubjectModalForm({ close }: { close: () => void }) {
  const [message, action, pending] = useActionState(addSubject, "");
  const [name, setName] = useState("");
  const { theme, Icon } = subjectStyle(name.trim() || "New subject");
  return <form action={action} className="subject-modal-form stack" aria-busy={pending}>
    <label htmlFor="new-subject-name">Subject name<input id="new-subject-name" name="name" placeholder="e.g. Business Communication" required maxLength={200}
      autoComplete="off" autoFocus value={name} onChange={event => setName(event.target.value)} /></label>
    <p className="muted subject-modal-help">Use the name your students know. You can organize all its quizzes here.</p>
    <div className={"subject-preview subject-" + theme} aria-hidden="true">
      <div className="subject-preview-icon"><Icon size={26} /></div>
      <div><span>YOUR NEW SUBJECT</span><strong>{name.trim() || "Your next great subject"}</strong><small>Ready for its first quiz</small></div>
      <ArrowUpRight size={20} />
    </div>
    {message && <p role="alert" className="error">{message}</p>}
    <div className="subject-modal-actions">
      <button type="button" disabled={pending} onClick={close}>Cancel</button>
      <button type="submit" className="primary" disabled={pending}><Plus size={17} />{pending ? "Adding subject…" : "Add subject"}</button>
    </div>
  </form>;
}

export function SubjectForm() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState(0);
  function close() {
    const dialog = dialogRef.current;
    if (dialog?.querySelector("form")?.getAttribute("aria-busy") === "true") return;
    dialog?.close();
  }
  return <>
    <button className="button primary subject-modal-trigger" type="button" aria-haspopup="dialog" onClick={() => {
      setSession(value => value + 1);
      dialogRef.current?.showModal();
    }}><Plus size={19} /> Add a subject</button>
    <dialog ref={dialogRef} className="subject-modal" aria-labelledby="subject-modal-title" aria-describedby="subject-modal-description"
      onCancel={event => {
        if (dialogRef.current?.querySelector("form")?.getAttribute("aria-busy") === "true") event.preventDefault();
      }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="subject-modal-content">
        <header className="subject-modal-header">
          <button className="subject-modal-close" type="button" aria-label="Close add subject" onClick={close}><X size={19} /></button>
          <span className="subject-modal-emblem"><BookOpen size={30} /></span>
          <p className="eyebrow"><Sparkles size={13} /> Grow your collection</p>
          <h2 id="subject-modal-title">A new subject.<br />A fresh beginning.</h2>
          <p id="subject-modal-description">Create a home for your next class.</p>
        </header>
        <SubjectModalForm key={session} close={close} />
      </div>
    </dialog>
  </>;
}
