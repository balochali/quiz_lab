"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, ListChecks, ChartNoAxesColumn, ArrowUpRight, Users, GraduationCap, ShieldCheck } from "lucide-react";

const links = [
  { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/subjects", label: "My subjects", Icon: BookOpen },
  { href: "/admin/quizzes", label: "Quiz library", Icon: ListChecks },
  { href: "/admin/results", label: "Results", Icon: ChartNoAxesColumn },
];
export function WorkspaceNav({ superAdmin = false }: { superAdmin?: boolean }) {
  const pathname = usePathname();
  const adminLinks = [
    { href: "/admin/platform", label: "Admin dashboard", Icon: ShieldCheck },
    { href: "/admin/platform/users", label: "Users", Icon: Users },
    { href: "/admin/platform/lecturers", label: "Lecturers", Icon: GraduationCap },
    { href: "/admin/platform/students", label: "Students", Icon: BookOpen },
    { href: "/admin/platform/quizzes", label: "All quizzes", Icon: ListChecks },
    { href: "/admin/platform/attempts", label: "All attempts", Icon: ChartNoAxesColumn },
    { href: "/admin/dashboard", label: "Lecturer workspace", Icon: LayoutDashboard },
  ];
  const items = superAdmin && pathname.startsWith("/admin/platform") ? adminLinks : [...links, ...(superAdmin ? [adminLinks[0], adminLinks[1]] : [])];
  return <nav className="stack">{items.map(({ href, label, Icon }) => {
    const active = pathname === href || (href !== "/admin/platform" && pathname.startsWith(href + "/"));
    return <Link href={href} key={href} aria-current={active ? "page" : undefined} className={active ? "nav-active" : ""}>
      <Icon size={19} /><span>{label}</span>{active && <ArrowUpRight size={16} />}
    </Link>;
  })}</nav>;
}
