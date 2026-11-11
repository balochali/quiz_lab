import Link from "next/link";
import { LogOut, Zap, Plus } from "lucide-react";
import { WorkspaceNav } from "@/components/workspace-nav";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../actions";

export default async function Workspace({ children }: { children: React.ReactNode }) {
  const accountId = await requireAdmin();
  const account = await db.admin.findUniqueOrThrow({ where: { id: accountId }, select: { role: true } });
  return <div className="workspace">
    <aside className="sidebar">
      <Link href="/admin/dashboard" className="brand"><span><Zap size={20} /></span> QuizLab</Link>
      <p className="eyebrow">Lecturer workspace</p>
      <WorkspaceNav />
      {account.role === "SUPER_ADMIN" && <Link className="button primary" href="/admin/platform">Platform admin</Link>}
      <div className="sidebar-prompt"><span className="eyebrow">Your next great quiz</span><p>A fresh challenge for your class.</p>
        <Link href="/admin/quizzes/create" className="button primary"><Plus size={16} /> Create quiz</Link>
      </div>
      <form action={signOut}><button className="quiet"><LogOut size={17} /> Sign out</button></form>
    </aside>
    <main className="workspace-main">{children}</main>
  </div>;
}
