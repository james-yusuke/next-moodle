const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();

export function dateTimeFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  const current = dateTimeFormatters.get(key);
  if (current !== undefined) return current;
  const created = new Intl.DateTimeFormat(locale, options);
  dateTimeFormatters.set(key, created);
  return created;
}

export function numberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  const current = numberFormatters.get(key);
  if (current !== undefined) return current;
  const created = new Intl.NumberFormat(locale, options);
  numberFormatters.set(key, created);
  return created;
}

export function dateKeyInTimeZone(
  timestampSeconds: number,
  timeZone: string,
): string {
  const parts = dateTimeFormatter("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(timestampSeconds * 1_000));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function calendarDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}
