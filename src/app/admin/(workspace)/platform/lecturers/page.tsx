import { AdminUserCard } from "@/components/admin-user-card";
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
      canPublishQuizzes: true, canExportResults: true, canCorrectMarks: true, subjects: { select: { name: true }, orderBy: { name: "asc" } }, _count: { select: { quizzes: true, subjects: true } } },
    orderBy: { email: "asc" }, skip: (page - 1) * 25, take: 26 });
  return <><header className="admin-page-heading"><p className="eyebrow">People & access</p><h1>Lecturers</h1><p>Explore profiles and manage teaching permissions.</p></header><form className="row wrap"><label>Find lecturer<input name="q" placeholder="Email address" defaultValue={q} /></label><button>Search</button></form>
    {query.saved === "1" && <p className="notice" role="status">Lecturer access updated.</p>}
    {accounts.length === 0 && <p>No matching lecturers.</p>}
    <div className="admin-user-grid">{accounts.slice(0, 25).map((account, index) => <AdminUserCard key={account.id} title={account.email} subtitle="Lecturer" status={account.suspended ? "Suspended" : account.verifiedAt ? "Verified" : "Pending verification"} metrics={[account._count.quizzes + " quizzes", account._count.subjects + " subjects"]} tone={index}>
      <div><h2>{account.email}</h2><p>{account.verifiedAt ? "Email verified" : "Awaiting confirmation"} · {account._count.quizzes} quizzes · {account._count.subjects} subjects</p></div>
      <div className="admin-user-metrics">{account.subjects.length ? account.subjects.map(subject => <span key={subject.name}>{subject.name}</span>) : <span>No subjects added yet</span>}</div>
      <form className="stack admin-permission-form" action={updateLecturer.bind(null, account.id)}>
        <label className="check"><input type="checkbox" name="suspended" defaultChecked={account.suspended} /> Suspend lecturer access and new student starts</label>
        <div className="field-grid">{Object.entries(lecturerPermissions).map(([key, label]) => <label className="check" key={key}>
          <input type="checkbox" name={key} defaultChecked={account[key as keyof typeof lecturerPermissions]} /> {label}
        </label>)}</div>
        <button className="primary">Save lecturer access</button>
      </form>
      <Link href={"/admin/platform/quizzes?" + new URLSearchParams({ lecturer: account.id })}>View their quizzes</Link>
    </AdminUserCard>)}</div>
    <nav className="row">
      {page > 1 && <Link href={"?" + new URLSearchParams({ q, page: String(page - 1) })}>Previous</Link>}
      {accounts.length > 25 && <Link href={"?" + new URLSearchParams({ q, page: String(page + 1) })}>Next</Link>}
    </nav>
  </>;
}
