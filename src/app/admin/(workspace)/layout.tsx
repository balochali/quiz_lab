import Link from "next/link";
import { BookOpen, LayoutDashboard, ListChecks, ChartNoAxesColumn, LogOut, Zap } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../actions";

export default async function Workspace({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="workspace">
    <aside className="sidebar">
      <Link href="/admin/dashboard" className="brand"><span><Zap size={20} /></span> QuizLab</Link>
      <p className="eyebrow">Lecturer workspace</p>
      <nav className="stack">
        <Link href="/admin/dashboard"><LayoutDashboard size={18} /> Overview</Link>
        <Link href="/admin/subjects"><BookOpen size={18} /> Subjects</Link>
        <Link href="/admin/quizzes"><ListChecks size={18} /> Quizzes</Link>
        <Link href="/admin/results"><ChartNoAxesColumn size={18} /> Results</Link>
      </nav>
      <form action={signOut}><button className="quiet"><LogOut size={17} /> Sign out</button></form>
    </aside>
    <main className="workspace-main">{children}</main>
  </div>;
}
