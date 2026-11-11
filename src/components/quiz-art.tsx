import { Check, Sparkles, Zap } from "lucide-react";
export function QuizArt() {
  return <div className="quiz-art" aria-hidden="true">
    <span className="art-spark"><Sparkles size={25} /></span>
    <div className="art-sheet">
      <div className="row between"><span className="art-label">QUIZ TIME</span><Zap size={22} /></div>
      <div className="art-line" /><div className="art-line short" />
      <div className="art-answer"><span>A</span><i /></div>
      <div className="art-answer correct"><span>B</span><i /><Check size={16} /></div>
      <div className="art-answer"><span>C</span><i /></div>
    </div>
    <span className="art-check"><Check size={25} /></span>
  </div>;
}
