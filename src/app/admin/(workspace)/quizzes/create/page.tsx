import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { Wizard } from "@/components/wizard";

export default async function CreateQuiz() {
  const adminId = await requirePermission("canCreateQuizzes");
  const subjects = await db.subject.findMany({ where: { adminId }, orderBy: { name: "asc" }, select: { name: true } });
  if (!subjects.length) return <section className="card stack">
    <h1>Create a quiz</h1>
    <p>Add a subject to your workspace first so you can organize your quizzes.</p>
    <Link href="/admin/subjects" className="button primary">Add a subject</Link>
  </section>;
  return <Wizard subjects={subjects.map(subject => subject.name)} />;
}
