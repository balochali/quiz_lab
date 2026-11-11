"use client";

import { Check, Eye, Hand, Shuffle, ListChecks, Maximize, Monitor, ShieldAlert, Timer, Repeat2 } from "lucide-react";
import { settings, type QuizInput } from "@/lib/quiz-schema";

type Setting = keyof typeof settings;
const rules = [
  { key: "randomQuestions", Icon: Shuffle, tone: "violet", help: "Give students a different question order." },
  { key: "randomOptions", Icon: ListChecks, tone: "blue", help: "Reorder the answer options for multiple-choice questions." },
  { key: "requireFullscreen", Icon: Maximize, tone: "mint", help: "Ask students to enter fullscreen before starting." },
  { key: "detectTabSwitch", Icon: Monitor, tone: "amber", help: "Record when students leave the quiz tab." },
  { key: "terminateOnTabSwitch", Icon: ShieldAlert, tone: "rose", help: "End the attempt when a student switches tabs." },
  { key: "autoSubmit", Icon: Timer, tone: "blue", help: "Submit saved answers when the attempt timer runs out." },
  { key: "multipleAttempts", Icon: Repeat2, tone: "violet", help: "Let the same student take this quiz more than once." },
] as const;

export function QuizSettings({ value, onChange }: { value: QuizInput; onChange: (key: Setting | "showResults", enabled: boolean) => void }) {
  return <div className="quiz-settings">
    <section aria-labelledby="result-policy-title">
      <div className="settings-section-heading"><span className="settings-eyebrow">01 · RESULTS</span><h3 id="result-policy-title">When should scores appear?</h3><p>Choose how students receive their results.</p></div>
      <div className="result-policy-grid" role="group" aria-label="Student result visibility">
        {[
          { automatic: true, Icon: Eye, title: "After the attempt", help: "Students can see their score after submitting.", tag: "Automatic", tone: "mint" },
          { automatic: false, Icon: Hand, title: "When I release them", help: "Keep scores hidden until you release results.", tag: "Your control", tone: "violet" },
        ].map(({ automatic, Icon, title, help, tag, tone }) => <button type="button" key={title} aria-pressed={value.showResults === automatic} className={`result-policy settings-tone-${tone} ${value.showResults === automatic ? "result-policy-selected" : ""}`} onClick={() => onChange("showResults", automatic)}>
          <span className="result-policy-top"><span className="settings-icon"><Icon size={24} /></span><span className="policy-selection" aria-hidden="true">{value.showResults === automatic && <Check size={16} />}</span></span>
          <span className="settings-eyebrow">{tag}</span><strong>{title}</strong><span className="settings-help">{help}</span>
        </button>)}
      </div>
      {value.questions.some(q => q.type === "THEORY") && <p className="settings-note">Written answers need lecturer grading before final scores become available.</p>}
    </section>
    <section aria-labelledby="attempt-rules-title">
      <div className="settings-section-heading"><span className="settings-eyebrow">02 · QUIZ RULES</span><h3 id="attempt-rules-title">Make it work for your class</h3><p>Tap a card to turn a rule on or off.</p></div>
      <div className="settings-rule-grid">
        {rules.map(({ key, Icon, tone, help }) => {
          const dependent = key === "terminateOnTabSwitch" && !value.detectTabSwitch;
          const enabled = !dependent && value[key];
          return <button type="button" role="switch" aria-checked={enabled} aria-labelledby={`rule-${key}-title`} aria-describedby={`rule-${key}-help`} disabled={dependent} key={key} className={`settings-rule settings-tone-${tone} ${enabled ? "settings-rule-enabled" : ""}`} onClick={() => onChange(key, !value[key])}>
            <span className="settings-icon"><Icon size={22} /></span>
            <span className="settings-rule-copy"><strong id={`rule-${key}-title`}>{settings[key]}</strong><span className="settings-help" id={`rule-${key}-help`}>{dependent ? "Enable tab monitoring to use this rule." : help}</span></span>
            <span className="settings-switch-area" aria-hidden="true"><span className="settings-switch"><span>{enabled && <Check size={12} />}</span></span><span>{dependent ? "Inactive" : enabled ? "On" : "Off"}</span></span>
          </button>;
        })}
      </div>
    </section>
  </div>;
}
