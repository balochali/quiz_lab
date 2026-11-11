import Link from "next/link";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { lecturerPermissions } from "@/lib/permissions";
import { updateLecturer } from "./actions";

export default async function Lecturers({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string; page?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 200) : "";
  const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
  const accounts = await db.admin.findMany({ where: { role: "LECTURER", email: { contains: q } },
    select: { id: true, email: true, verifiedAt: true, suspended: true, canCreateQuizzes: true,
      canPublishQuizzes: true, canExportResults: true, canCorrectMarks: true, _count: { select: { quizzes: true, subjects: true } } },
    orderBy: { email: "asc" }, skip: (page - 1) * 25, take: 26 });
  return <><form className="row wrap"><label>Find lecturer<input name="q" placeholder="Email address" defaultValue={q} /></label><button>Search</button></form>
    {query.saved === "1" && <p className="notice" role="status">Lecturer access updated.</p>}
    {accounts.length === 0 && <p>No matching lecturers.</p>}
    {accounts.slice(0, 25).map(account => <article className="card stack" key={account.id}>
      <div><h2>{account.email}</h2><p>{account.verifiedAt ? "Email verified" : "Awaiting confirmation"} · {account._count.quizzes} quizzes · {account._count.subjects} subjects</p></div>
      <form className="stack" action={updateLecturer.bind(null, account.id)}>
        <label className="check"><input type="checkbox" name="suspended" defaultChecked={account.suspended} /> Suspend lecturer access and new student starts</label>
        <div className="field-grid">{Object.entries(lecturerPermissions).map(([key, label]) => <label className="check" key={key}>
          <input type="checkbox" name={key} defaultChecked={account[key as keyof typeof lecturerPermissions]} /> {label}
        </label>)}</div>
        <button className="primary">Save lecturer access</button>
      </form>
      <Link href={"/admin/platform/quizzes?" + new URLSearchParams({ lecturer: account.id })}>View their quizzes</Link>
    </article>)}
    <nav className="row">
      {page > 1 && <Link href={"?" + new URLSearchParams({ q, page: String(page - 1) })}>Previous</Link>}
      {accounts.length > 25 && <Link href={"?" + new URLSearchParams({ q, page: String(page + 1) })}>Next</Link>}
    </nav>
  </>;
}
