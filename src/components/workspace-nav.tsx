"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, ListChecks, ChartNoAxesColumn, ArrowUpRight } from "lucide-react";

const links = [
  { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/subjects", label: "My subjects", Icon: BookOpen },
  { href: "/admin/quizzes", label: "Quiz library", Icon: ListChecks },
  { href: "/admin/results", label: "Results", Icon: ChartNoAxesColumn },
];
export function WorkspaceNav() {
  const pathname = usePathname();
  return <nav className="stack">{links.map(({ href, label, Icon }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return <Link href={href} key={href} aria-current={active ? "page" : undefined} className={active ? "nav-active" : ""}>
      <Icon size={19} /><span>{label}</span>{active && <ArrowUpRight size={16} />}
    </Link>;
  })}</nav>;
}
