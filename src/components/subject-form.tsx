"use client";

import { useActionState } from "react";
import { addSubject } from "@/app/admin/(workspace)/subjects/actions";

export function SubjectForm() {
  const [message, action, pending] = useActionState(addSubject, "");
  return <form action={action} className="stack">
    <label>Subject name<input name="name" placeholder="e.g. Database Systems" required maxLength={200} /></label>
    {message && <p role="alert" className="error">{message}</p>}
    <button className="primary" disabled={pending}>{pending ? "Saving…" : "Add subject"}</button>
  </form>;
}
