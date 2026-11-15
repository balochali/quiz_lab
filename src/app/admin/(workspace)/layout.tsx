import Link from "next/link";
import { LogOut, Zap, Plus, Users } from "lucide-react";
import { WorkspaceNav } from "@/components/workspace-nav";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../actions";

export default async function Workspace({ children }: { children: React.ReactNode }) {
  const accountId = await requireAdmin();
  const account = await db.admin.findUniqueOrThrow({ where: { id: accountId }, select: { role: true } });
  return <div className="workspace">
    <aside className={"sidebar" + (account.role === "SUPER_ADMIN" ? " sidebar-admin" : "")}>
      <Link href={account.role === "SUPER_ADMIN" ? "/admin/platform" : "/admin/dashboard"} className="brand"><span><Zap size={20} /></span> QuizLab</Link>
      <p className="eyebrow">{account.role === "SUPER_ADMIN" ? "Administrator workspace" : "Lecturer workspace"}</p>
      <WorkspaceNav superAdmin={account.role === "SUPER_ADMIN"} />
      <div className="sidebar-prompt"><span className="eyebrow">{account.role === "SUPER_ADMIN" ? "Your campus, connected" : "Your next great quiz"}</span><p>{account.role === "SUPER_ADMIN" ? "Manage people, permissions, and assessments." : "A fresh challenge for your class."}</p>
        {account.role === "SUPER_ADMIN" ? <Link href="/admin/platform/users" className="button primary"><Users size={16} /> Manage users</Link> : <Link href="/admin/quizzes/create" className="button primary"><Plus size={16} /> Create quiz</Link>}
      </div>
      <form action={signOut}><button className="quiet"><LogOut size={17} /> Sign out</button></form>
    </aside>
    <main className="workspace-main">{children}</main>
  </div>;
}
