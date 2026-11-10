import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuiz } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ConfirmDeletion({ params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin();
  const { id } = await params;
  const quiz = await db.quiz.findFirst({
    where: { id, adminId },
    select: { title: true, _count: { select: { attempts: true } } },
  });
  if (!quiz) notFound();
  const attempts = quiz._count.attempts;

  return <section className="card stack">
    <p className="eyebrow">Quiz library</p>
    <h1>Delete “{quiz.title}”?</h1>
    <p>This permanently deletes the quiz and its student link. {attempts > 0 &&
      `It also removes ${attempts} student ${attempts === 1 ? "attempt" : "attempts"} and any associated results.`}</p>
    <form className="row wrap" action={deleteQuiz.bind(null, id)}>
      <Link className="button" href="/admin/quizzes">Cancel</Link>
      <button className="danger">Delete permanently</button>
    </form>
  </section>;
}
