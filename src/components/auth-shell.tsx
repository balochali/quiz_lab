import type { ReactNode } from "react";
import { BarChart3, BookOpenCheck, ShieldCheck, Sparkles, Zap } from "lucide-react";

export function AuthShell({ mode, title, description, children }: { mode: string; title: string; description: string; children: ReactNode }) {
  return <main className="auth-shell">
    <section className="auth-showcase" aria-label="About QuizLab">
      <div className="auth-brand"><span><Zap size={23} /></span><strong>QuizLab</strong></div>
      <div className="auth-showcase-copy">
        <p className="eyebrow"><Sparkles size={15} /> Assessment workspace</p>
        <h1>Build better quiz moments.</h1>
        <p>QuizLab gives lecturers one focused place to create assessments, guide students, and review results with confidence.</p>
      </div>
      <div className="auth-feature-list" aria-label="QuizLab features">
        <span><BookOpenCheck size={18} /> Create engaging assessments</span>
        <span><ShieldCheck size={18} /> Set clear quiz rules</span>
        <span><BarChart3 size={18} /> Review results in one place</span>
      </div>
      <div className="auth-orbit auth-orbit-one" aria-hidden="true" /><div className="auth-orbit auth-orbit-two" aria-hidden="true" />
    </section>
    <section className="auth-panel">
      <div className="auth-panel-top"><div className="auth-mode-icon"><Zap size={21} /></div><div><p className="eyebrow">QuizLab · {mode}</p><p className="auth-panel-note">Your teaching workspace</p></div></div>
      <div className="auth-form-heading"><h1>{title}</h1><p>{description}</p></div>
      <div className="auth-form-content">{children}</div>
    </section>
  </main>;
}
