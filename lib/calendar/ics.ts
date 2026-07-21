export type IcsEvent = Readonly<{
  id: number;
  name: string;
  startsAt: number;
}>;

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r?\n/g, "\\n");
}

function utcDate(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1_000)
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(".000", "");
}

export function generateIcs(events: readonly IcsEvent[]): string {
  const unique = new Map(events.map((event) => [event.id, event]));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//next-moodle//Learning Calendar//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const event of unique.values()) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:event-${event.id}@next-moodle.invalid`,
      `DTSTART:${utcDate(event.startsAt)}`,
      `DTEND:${utcDate(event.startsAt + 3_600)}`,
      `SUMMARY:${escapeText(event.name)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}
