"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AwaitingResults({ gradingPending = false }: { gradingPending?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 5000);
    function refreshWhenVisible() {
      if (!document.hidden) router.refresh();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router]);

  return <p className="notice" role="status">{gradingPending ? "Your written answers are awaiting lecturer grading. Your final result will appear when grading and release are complete." : "Your score will appear here when your lecturer releases results."}</p>;
}
