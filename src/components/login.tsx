"use client";
import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";
import { Button } from "./ui/button";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, "");
  return <form action={action} className="stack">
    <label>Email<input type="email" name="email" autoComplete="username" required /></label>
    <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
  </form>;
}
