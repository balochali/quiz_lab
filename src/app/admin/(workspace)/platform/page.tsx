import Link from "next/link";
import { Users, GraduationCap, ListChecks, Activity, ArrowUpRight, Gauge, ShieldCheck } from "lucide-react";
import { loadPlatformOverview } from "@/lib/platform-overview";
import { requireSuperAdmin } from "@/lib/auth";
import { AdminCharts } from "@/components/admin-charts";

export default async function PlatformOverview() {
  await requireSuperAdmin();
  const { lecturers, students, quizzes, attempts, subjects, suspended, pending, queryMs, days, completed, active } = await loadPlatformOverview();
  return <>
    <header className="admin-dashboard-hero"><div><p className="eyebrow">Platform administration</p><h1>A view of your whole campus</h1><p>Manage your community, follow assessment activity, and keep teaching moving.</p></div><Link className="button primary" href="/admin/platform/users"><Users size={18} /> Manage users <ArrowUpRight size={16} /></Link></header>
    <section className="admin-dashboard-metrics">{[
      { label: "Lecturers", count: lecturers, href: "lecturers", Icon: GraduationCap, note: suspended + " suspended" },
      { label: "Students", count: students, href: "students", Icon: Users, note: "Across the platform" },
      { label: "Quizzes", count: quizzes, href: "quizzes", Icon: ListChecks, note: subjects + " teaching subjects" },
      { label: "Attempts", count: attempts, href: "attempts", Icon: Activity, note: active + " marked in progress" },
    ].map(({label, count, href, Icon, note}, index) => <Link key={label} href={"/admin/platform/" + href} className={"admin-stat admin-user-tone-" + index}><span className="row between"><Icon size={23} /><ArrowUpRight size={17} /></span><strong>{count}</strong><span>{label}</span><small>{note}</small></Link>)}</section>
    <AdminCharts days={days} lecturers={lecturers} students={students} />
    <section className="card admin-platform-health"><div className="row between wrap"><div><p className="eyebrow">Application performance</p><h2><Gauge size={22} /> Platform signals</h2></div><span className="badge"><ShieldCheck size={14} /> Database queries completed</span></div><div className="admin-health-grid"><div><span>Dashboard data queries</span><strong>{queryMs} ms</strong><small>Measured for this page request; includes database/network time.</small></div><div><span>Submitted attempts</span><strong>{attempts ? Math.round(completed / attempts * 100) : 0}%</strong><progress aria-label="Submitted attempt rate" value={completed} max={attempts || 1} /><small>{completed} submitted of {attempts} total attempts</small></div><div><span>Awaiting grading</span><strong>{pending}</strong><small>Submissions that need written-answer review</small></div></div><p className="muted admin-telemetry-note">Uptime, server error rates, and browser load times are not currently tracked. This view shows database query timing and assessment activity.</p></section>
  </>;
}
