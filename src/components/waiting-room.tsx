"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatQuizOpening } from "@/lib/quiz-schedule";
import { BookOpen, ClipboardList } from "lucide-react";
import { CodeContent } from "./code-content";

export function WaitingRoom({ title, course, opensAt, serverNow, description = "", instructions = "" }: {
  title: string; course: string; opensAt: number; serverNow: number; description?: string; instructions?: string;
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(() => Math.ceil((opensAt - serverNow) / 1000));

  useEffect(() => {
    const loadedAt = performance.now();
    let lastRefresh = -Infinity;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - loadedAt;
      const seconds = Math.max(0, Math.ceil((opensAt - serverNow - elapsed) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && elapsed - lastRefresh >= 3000) {
        lastRefresh = elapsed;
        router.refresh();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [opensAt, router, serverNow]);

  const days = Math.floor(remaining / 86400);
  const clock = [Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60]
    .map(value => String(value).padStart(2, "0")).join(":");

  return <main className="narrow card">
    <p className="eyebrow">Scheduled assessment</p>
    <h1>{title}</h1><p>{course}</p>
    <div className="notice stack">
      <p>Opens {formatQuizOpening(opensAt)}</p>
      <p className="score" role="timer" aria-label="Time until quiz opens">{days > 0 && days + "d "}{clock}</p>
      <p>{remaining > 0 ? "Keep this page open. You can join when the quiz opens." : "Checking whether the quiz is open…"}</p>
    </div>
    {description.trim() && <section className="waiting-reading waiting-description" aria-labelledby="waiting-description-heading"><h2 id="waiting-description-heading"><BookOpen size={21} /> About this quiz</h2><CodeContent text={description} /></section>}
    {instructions.trim() && <section className="waiting-reading waiting-instructions" aria-labelledby="waiting-instructions-heading"><h2 id="waiting-instructions-heading"><ClipboardList size={21} /> Student instructions</h2><CodeContent text={instructions} /></section>}
  </main>;
}
