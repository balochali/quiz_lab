import Link from "next/link";
import { quizLinkClosed, upcomingOpening } from "@/lib/quiz-schedule";
import { subjectStyle } from "@/lib/subject-style";
import { ArrowUpRight, BookOpen, ListChecks, Trophy, Trash2, Users } from "lucide-react";
import { CopyLink } from "./copy-link";

type Quiz = { id: string; code: string; title: string; course: string; published: boolean; opensAt: Date | null; expiresAt: Date | null; closedAt: Date | null; _count: { questions: number; attempts: number } };

export function QuizList({ quizzes, filtered = false }: { quizzes: Quiz[]; filtered?: boolean }) {
  if (!quizzes.length) return <div className="card empty quiz-empty"><BookOpen size={35} />
    <h3>{filtered ? "No quizzes match these filters" : "Your next challenge starts here"}</h3>
    <p>{filtered ? "Try another subject or search term." : "Create a quiz and bring your next class to life."}</p>
    <div className="row wrap">{filtered && <Link className="button" href="/admin/quizzes">Clear filters</Link>}
      <Link className="button primary" href="/admin/quizzes/create">Create a quiz</Link></div>
  </div>;
  return <div className="quiz-grid">{quizzes.map(quiz => {
    const { Icon, theme } = subjectStyle(quiz.course);
    const status = !quiz.published ? "Draft" : quizLinkClosed(quiz) ? "Closed" : upcomingOpening(quiz.opensAt) ? "Scheduled" : "Published";
    return <article className={"quiz-tile subject-" + theme} key={quiz.id}>
      <header className="quiz-tile-cover">
        <span className="quiz-course-icon"><Icon size={25} strokeWidth={1.8} /></span>
        <span className={"quiz-status quiz-status-" + status.toLowerCase()}><i aria-hidden="true" />{status}</span>
        <span className="quiz-tile-decoration" aria-hidden="true"><Icon size={100} strokeWidth={.8} /></span>
      </header>
      <div className="quiz-tile-body">
        <p className="subject-kicker">{quiz.course}</p>
        <h3><Link href={"/admin/quizzes/" + quiz.id + "/edit"}>{quiz.title}</Link></h3>
        <div className="quiz-tile-metrics">
          <span><ListChecks size={16} />{quiz._count.questions} questions</span>
          <span><Users size={16} />{quiz._count.attempts} attempts</span>
        </div>
        <div className="quiz-tile-primary">
          <Link className="button quiz-view" href={"/admin/quizzes/" + quiz.id + "/edit"}>{quiz._count.attempts ? "View quiz" : "Edit quiz"}<ArrowUpRight size={16} /></Link>
          {quiz.published && <Link className="button" href={"/admin/quizzes/" + quiz.id + "/leaderboard"}><Trophy size={16} />Link &amp; leaderboard</Link>}
        </div>
      </div>
      <footer className="quiz-tile-footer">
        {quiz.published ? <CopyLink code={quiz.code} /> : <span className="muted">Publish to share with students</span>}
        <Link className="quiz-delete" href={"/admin/quizzes/" + quiz.id + "/delete"} aria-label={"Delete " + quiz.title}><Trash2 size={16} /><span>Delete</span></Link>
      </footer>
    </article>;
  })}</div>;
}
