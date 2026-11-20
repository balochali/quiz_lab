import { Eye, Clock, ShieldCheck, Info, ArrowUpRight } from "lucide-react";
import { durationLabel, formatKarachiDateTime, monitoringTimeline, type MonitoringEvent } from "@/lib/monitoring";

const descriptions: Record<string, { title: string; text: string; tone: string }> = {
  BLUR: { title: "Quiz window lost focus", text: "Keyboard focus moved away from the quiz. Browser controls, another window, or an operating-system dialog can cause this. The destination is not available.", tone: "amber" },
  FOCUS: { title: "Focus returned to the quiz", text: "The browser reported that the quiz window regained keyboard focus.", tone: "mint" },
  TAB_SWITCH: { title: "Quiz page became hidden", text: "The page was no longer visible. Switching tabs, minimizing, or covering the window can cause this; the browser does not identify the other app or website.", tone: "rose" },
  VISIBLE: { title: "Quiz page became visible again", text: "The browser reported that the quiz page was visible again. Visibility and keyboard focus are separate signals.", tone: "mint" },
  FULLSCREEN_EXIT: { title: "Fullscreen was exited", text: "The quiz left fullscreen. This event does not identify whether Escape, a browser control, or another action caused it.", tone: "violet" },
  FULLSCREEN_RESTORED: { title: "Fullscreen was restored", text: "Fullscreen was restored during the allowed recovery period.", tone: "mint" },
};

export function MonitoringTimeline({ events }: { events: MonitoringEvent[] }) {
  const timeline = monitoringTimeline(events);
  const legacy = timeline.filter(event => !event.context).length;
  return <section className="card stack result-monitoring monitoring-review">
    <div className="row between wrap"><h2><ShieldCheck size={23} /> Monitoring timeline</h2><span className="badge">{events.length} recorded events · Karachi time</span></div>
    <p className="monitoring-explainer"><Info size={18} /><span>These are browser-reported signals, not proof of misconduct. Other websites, apps, and the exact reason for lost focus are not visible to QuizLab. Recorded intervals are based on server receipt times and may include network delay.</span></p>
    {legacy > 0 && <p className="monitoring-legacy">{legacy} older/basic {legacy === 1 ? "record contains" : "records contain"} only an event type and timestamp. Question context, exact causes, and time away cannot be reconstructed for those records.</p>}
    <div className="monitoring-summary">{[["Focus losses", "BLUR"], ["Page hidden", "TAB_SWITCH"], ["Fullscreen exits", "FULLSCREEN_EXIT"]].map(([label, type]) => <div key={type}><strong>{events.filter(event => event.type === type).length}</strong><span>{label}</span></div>)}</div>
    {!events.length ? <p>No monitoring events recorded.</p> : <ol className="monitoring-event-list">{timeline.map(event => {
      const info = descriptions[event.type] ?? { title: event.type, text: "A browser monitoring event was recorded.", tone: "violet" };
      return <li key={event.id}><details className={"monitoring-event monitoring-tone-" + info.tone}>
        <summary><span className="monitoring-event-icon"><Eye size={18} /></span><span><strong>{info.title}</strong><time dateTime={event.createdAt.toISOString()}>{formatKarachiDateTime(event.createdAt)}</time></span><ArrowUpRight size={16} /></summary>
        <div className="monitoring-event-body"><p>{info.text}</p><div className="monitoring-context-chips"><span>Question {event.context?.questionNumber ?? "not recorded"}</span>{event.context?.visibility && <span>Page: {event.context.visibility}</span>}{typeof event.context?.hasFocus === "boolean" && <span>Window focused: {event.context.hasFocus ? "Yes" : "No"}</span>}{typeof event.context?.fullscreen === "boolean" && <span>Fullscreen: {event.context.fullscreen ? "Yes" : "No"}</span>}</div><p className="monitoring-interval"><Clock size={15} />{event.durationMs !== null ? "Recorded loss-to-return interval: " + durationLabel(event.durationMs) : "No matching loss/return pair recorded; duration unavailable."}</p></div>
      </details></li>;
    })}</ol>}
  </section>;
}
