const pakistanOffset = 5 * 60 * 60 * 1000;

export function quizLinkClosed({ expiresAt, closedAt }: { expiresAt: Date | null; closedAt: Date | null }) {
  return closedAt !== null || (expiresAt !== null && expiresAt.getTime() <= Date.now());
}

export function upcomingOpening(opensAt: Date | null) {
  const serverNow = Date.now();
  const timestamp = opensAt?.getTime();
  return timestamp !== undefined && timestamp > serverNow ? { opensAt: timestamp, serverNow } : null;
}

export function pakistanInputValue(iso: string) {
  return new Date(Date.parse(iso) + pakistanOffset).toISOString().slice(0, 16);
}

export function formatQuizOpening(timestamp: number) {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short",
  }).format(timestamp) + " PKT";
}
