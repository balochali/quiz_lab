import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export default function Home() {
  return <main className="landing">
    <div className="brand"><span><Zap size={20} /></span> QuizLab</div>
    <section className="hero">
      <p className="eyebrow">University assessment workspace</p>
      <h1>From lab quiz to results.</h1>
      <p>Create an assessment, share a link with your class, and get results as students finish.</p>
      <Link className="button light" href="/admin/dashboard">Lecturer workspace <ArrowRight size={17} /></Link>
    </section>
    <p className="muted">Taking a quiz? Open the link shared by your lecturer.</p>
  </main>;
}
