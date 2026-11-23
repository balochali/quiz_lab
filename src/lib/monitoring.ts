export type MonitoringEvent = { id: string; type: string; createdAt: Date; details?: string | null };
type Context = { version: number; questionNumber?: number; visibility?: string; hasFocus?: boolean; fullscreen?: boolean };
export function monitoringContext(raw?: string | null): Context | null {
  try { const data = raw ? JSON.parse(raw) : null; return data?.version === 1 ? data : null; } catch { return null; }
}
export function formatKarachiDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(new Date(value)) + " PKT";
}
export function monitoringTimeline(events: MonitoringEvent[]) {
  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const open = new Map<string, MonitoringEvent>();
  const intervals = new Map<string, { durationMs: number; loss: MonitoringEvent; returned: MonitoringEvent }>();
  const losses = new Set(["BLUR", "TAB_SWITCH", "FULLSCREEN_EXIT"]);
  const returns: Record<string, string> = { FOCUS: "BLUR", VISIBLE: "TAB_SWITCH", FULLSCREEN_RESTORED: "FULLSCREEN_EXIT" };
  for (const event of sorted) {
    if (!monitoringContext(event.details)) continue;
    if (losses.has(event.type) && !open.has(event.type)) open.set(event.type, event);
    const previous = open.get(returns[event.type]);
    if (previous) {
      const duration = Math.max(0, event.createdAt.getTime() - previous.createdAt.getTime());
      const interval = { durationMs: duration, loss: previous, returned: event };
      intervals.set(previous.id, interval); intervals.set(event.id, interval); open.delete(returns[event.type]);
    }
  }
  return sorted.map(event => {
    const interval = intervals.get(event.id);
    return { ...event, context: monitoringContext(event.details), durationMs: interval?.durationMs ?? null, interval };
  });
}
export function durationLabel(milliseconds: number) {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return seconds + (seconds === 1 ? " second" : " seconds");
  return Math.floor(seconds / 60) + " min " + seconds % 60 + " sec";
}
