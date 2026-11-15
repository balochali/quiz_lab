import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import Lecturers from "../lecturers/page";
import Students from "../students/page";

export default async function Users({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; page?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const students = query.type === "students";
  return <><nav className="admin-people-tabs" aria-label="User type"><Link className={!students ? "selected" : ""} href="/admin/platform/users" aria-current={!students ? "page" : undefined}>Lecturers</Link><Link className={students ? "selected" : ""} href="/admin/platform/users?type=students" aria-current={students ? "page" : undefined}>Students</Link></nav>{students ? <Students searchParams={Promise.resolve(query)} /> : <Lecturers searchParams={Promise.resolve(query)} />}</>;
}
