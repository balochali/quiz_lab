import { notFound, redirect } from "next/navigation";
import { AwaitingResults } from "@/components/awaiting-results";
import { studentState } from "@/lib/attempt";
import { statusLabel } from "@/lib/quiz-schema";

export default async function Result({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const state = await studentState(attemptId);
  if (!state) notFound();
  if (state.phase === "active") redirect("/quiz/" + attemptId);
  return <main className="narrow card">
    <p className="eyebrow">Attempt complete</p><h1>{statusLabel(state.status)}</h1>
    <p>{state.title}</p>
    <p>Your saved answers have been graded.</p>
    {state.result ? <div className="score">{state.result.score} / {state.result.total}</div> : <AwaitingResults />}
  </main>;
}

