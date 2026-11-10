import { notFound, redirect } from "next/navigation";
import { studentState } from "@/lib/attempt";
import { Exam } from "@/components/exam";

export default async function Attempt({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const state = await studentState(attemptId);
  if (!state) notFound();
  if (state.phase === "closed") redirect("/quiz/" + attemptId + "/result");
  return <Exam initial={state} />;
}

