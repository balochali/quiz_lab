import Link from "next/link";
import { quizLinkClosed, upcomingOpening } from "@/lib/quiz-schedule";
import { Trash2 } from "lucide-react";
import { CopyLink } from "./copy-link";

type Quiz = { id: string; code: string; title: string; course: string; published: boolean; opensAt: Date | null; expiresAt: Date | null; closedAt: Date | null; _count: { questions: number; attempts: number } };

export function QuizList({ quizzes }: { quizzes: Quiz[] }) {
  if (!quizzes.length) return <div className="card empty"><h3>No quizzes yet</h3><p>Create a quiz to get started.</p>
    <Link className="button primary" href="/admin/quizzes/create">Create a quiz</Link></div>;
  return <div className="stack">{quizzes.map(quiz => <article className="card row between wrap quiz-item" key={quiz.id}>
    <div><p className="eyebrow">{quiz.course}</p><h3>{quiz.title}</h3>
      <p className="muted">{quiz._count.questions} questions · {quiz._count.attempts} attempts</p></div>
    <div className="row wrap"><span className={"badge " + (quiz.published ? "green" : "")}>{quiz.published ? quizLinkClosed(quiz) ? "Closed" : upcomingOpening(quiz.opensAt) ? "Scheduled" : "Published" : "Draft"}</span>
      {quiz.published && <><CopyLink code={quiz.code} />
        <Link className="button" href={"/admin/quizzes/" + quiz.id + "/leaderboard"}>Link &amp; leaderboard</Link></>}
      <Link className="button" href={"/admin/quizzes/" + quiz.id + "/edit"}>{quiz._count.attempts ? "View quiz" : "Edit"}</Link>
      <Link className="button" href={"/admin/quizzes/" + quiz.id + "/delete"}><Trash2 size={16} /> Delete</Link>
    </div>
  </article>)}</div>;
}
