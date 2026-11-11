import Link from "next/link";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
export default async function PlatformQuizzes({ searchParams }: { searchParams: Promise<{ q?: string; lecturer?: string; page?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 200) : "";
  const lecturer = typeof query.lecturer === "string" ? query.lecturer : "";
  const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
  const rows = await db.quiz.findMany({
    where: { title: { contains: q }, ...(lecturer ? { adminId: lecturer } : {}) },
    select: { id: true, title: true, course: true, published: true, admin: { select: { email: true } }, _count: { select: { attempts: true } } },
    orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 51,
  });
  const params = new URLSearchParams({ q, lecturer });
  return <><form className="row wrap">
    <label>Find quiz<input name="q" defaultValue={q} /></label><input type="hidden" name="lecturer" value={lecturer} /><button>Search</button>
    <Link href="/admin/platform/quizzes">All lecturers</Link>
  </form><section className="card scroll"><table>
    <thead><tr><th>Quiz</th><th>Subject</th><th>Lecturer</th><th>Status</th><th>Attempts</th></tr></thead>
    <tbody>{rows.slice(0, 50).map(q => <tr key={q.id}><td><Link href={"/admin/platform/quizzes/" + q.id}>{q.title}</Link></td>
      <td>{q.course}</td><td>{q.admin.email}</td><td>{q.published ? "Published" : "Draft"}</td><td>{q._count.attempts}</td></tr>)}</tbody>
  </table>{!rows.length && <p>No matching quizzes.</p>}</section><nav className="row">
    {page > 1 && <Link href={"?" + params + "&page=" + (page - 1)}>Previous</Link>}
    {rows.length > 50 && <Link href={"?" + params + "&page=" + (page + 1)}>Next</Link>}
  </nav></>;
}
