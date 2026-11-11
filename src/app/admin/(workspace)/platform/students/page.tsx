import Link from "next/link";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 150) : "";
  const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
  const students = await db.student.findMany({
    where: { OR: [{ name: { contains: q } }, { rollNumber: { contains: q.toUpperCase() } }] },
    select: { id: true, name: true, rollNumber: true, semester: true, _count: { select: { attempts: true } } },
    orderBy: { rollNumber: "asc" }, skip: (page - 1) * 50, take: 51,
  });
  return <><form className="row wrap"><label>Student name or roll number<input name="q" defaultValue={q} /></label><button>Search</button></form>
    <section className="card scroll"><table><thead><tr><th>Name</th><th>Roll number</th><th>Semester</th><th>Attempts</th></tr></thead>
      <tbody>{students.slice(0, 50).map(student => <tr key={student.id}><td>{student.name}</td><td>{student.rollNumber}</td><td>{student.semester}</td>
        <td><Link href={"/admin/platform/attempts?" + new URLSearchParams({ student: student.id })}>{student._count.attempts}</Link></td></tr>)}</tbody></table>
      {!students.length && <p>No matching students.</p>}
    </section><nav className="row">
      {page > 1 && <Link href={"?" + new URLSearchParams({ q, page: String(page - 1) })}>Previous</Link>}
      {students.length > 50 && <Link href={"?" + new URLSearchParams({ q, page: String(page + 1) })}>Next</Link>}
    </nav></>;
}
