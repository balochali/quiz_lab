import Link from "next/link";
import { ArrowRight, Zap, BookOpen, Trophy, Clock } from "lucide-react";

import { QuizArt } from "@/components/quiz-art";

export default function Home() {
  return <main className="landing">
    <div className="brand"><span><Zap size={20} /></span> QuizLab</div>
    <section className="hero landing-hero">
      <p className="eyebrow">University assessment workspace</p>
      <h1>Big ideas.<br />Brilliant quizzes.</h1>
      <QuizArt />
      <p>Create an assessment, share a link with your class, and get results as students finish.</p>
      <Link className="button light" href="/admin/dashboard">Lecturer workspace <ArrowRight size={17} /></Link>
    </section>
    <div className="landing-features">
      <article className="card"><BookOpen /><h3>Build your challenge</h3><p>Your subjects. Your questions. Your class.</p></article>
      <article className="card"><Clock /><h3>Ready, set, quiz</h3><p>Scheduled starts and a focused exam experience.</p></article>
      <article className="card"><Trophy /><h3>See the progress</h3><p>Automatic grading and results in one place.</p></article>
    </div>
    <p className="muted">Taking a quiz? Open the link shared by your lecturer.</p>
  </main>;
}
