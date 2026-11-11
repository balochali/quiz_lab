import Link from "next/link";
import { BookOpen, Layers3, Plus, Search, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { subjectStyle } from "@/lib/subject-style";
import { QuizList } from "@/components/quiz-list";

export default async function Quizzes({ searchParams }: { searchParams: Promise<{ subject?: string; q?: string }> }) {
  const adminId = await requireAdmin();
  const query = await searchParams;
  const selected = typeof query.subject === "string" ? query.subject : "";
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 200) : "";
  const [quizzes, subjects, grouped] = await Promise.all([
    db.quiz.findMany({ where: { adminId, ...(selected ? { course: selected } : {}), ...(q ? { title: { contains: q } } : {}) }, orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true, attempts: true } } } }),
    db.subject.findMany({ where: { adminId }, orderBy: { name: "asc" } }),
    db.quiz.groupBy({ by: ["course"], where: { adminId }, _count: { _all: true } }),
  ]);
  const counts = new Map(grouped.map(row => [row.course, row._count._all]));
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const filterLink = (subject: string) => "/admin/quizzes?" + new URLSearchParams({ ...(subject ? { subject } : {}), ...(q ? { q } : {}) });

  return <>
    <header className="library-header row between wrap">
      <div><p className="eyebrow"><Sparkles size={15} /> Your assessment collection</p><h1>Quiz library</h1><p className="muted">Every subject. Every challenge. All in one place.</p></div>
      <Link className="button primary" href="/admin/quizzes/create"><Plus size={18} /> Create new quiz</Link>
    </header>
    <section className="library-filters card stack" aria-labelledby="filter-subjects-title">
      <div className="row between wrap">
        <div><h2 id="filter-subjects-title">Find your next quiz</h2><p className="muted">Explore your library by subject.</p></div>
        <span className="subject-total"><Layers3 size={16} />{total} {total === 1 ? "quiz" : "quizzes"} in your library</span>
      </div>
      <nav className="subject-filter-list" aria-label="Filter quizzes by subject">
        <Link className={"subject-filter subject-violet " + (!selected ? "filter-active" : "")} aria-current={!selected ? "page" : undefined} href={filterLink("")}>
          <BookOpen size={17} /><span>All subjects</span><b>{total}</b>
        </Link>
        {subjects.map(subject => {
          const { Icon, theme } = subjectStyle(subject.name);
          const active = selected === subject.name;
          return <Link key={subject.id} className={"subject-filter subject-" + theme + (active ? " filter-active" : "")} aria-current={active ? "page" : undefined} href={filterLink(subject.name)}>
            <Icon size={17} /><span>{subject.name}</span><b>{counts.get(subject.name) ?? 0}</b>
          </Link>;
        })}
      </nav>
      <form className="library-search" role="search">
        {selected && <input type="hidden" name="subject" value={selected} />}
        <label><span className="sr-only">Search quiz titles</span><Search size={18} aria-hidden="true" /><input name="q" placeholder="Search your quizzes…" defaultValue={q} /></label>
        <button>Search</button>
        {(q || selected) && <Link href="/admin/quizzes">Clear filters</Link>}
      </form>
    </section>
    <div className="row between wrap"><h2>{selected || "All quizzes"}</h2><span className="muted">{quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}{q ? " matching your search" : ""}</span></div>
    <QuizList quizzes={quizzes} filtered={Boolean(q || selected)} />
  </>;
}
