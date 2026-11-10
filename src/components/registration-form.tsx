"use client";

import { useActionState } from "react";
import { confirmRegistration, requestVerification } from "@/app/admin/registration";

export function SignupForm() {
  const [message, action, pending] = useActionState(requestVerification, "");
  return <form className="stack" action={action}>
    <label>Email<input type="email" name="email" autoComplete="email" maxLength={254} required /></label>
    {message && <p role="status" className="notice">{message}</p>}
    <button className="primary" disabled={pending}>{pending ? "Sending…" : "Send confirmation email"}</button>
  </form>;
}

export function VerifyForm({ token }: { token: string }) {
  const [message, action, pending] = useActionState(confirmRegistration.bind(null, token), "");
  return <form className="stack" action={action}>
    <label>Password<input type="password" name="password" autoComplete="new-password" minLength={12} maxLength={256} required /></label>
    <label>Confirm password<input type="password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={256} required /></label>
    {message && <p role="alert" className="error">{message}</p>}
    <button className="primary" disabled={pending}>{pending ? "Confirming…" : "Confirm email and create account"}</button>
  </form>;
}
