import { APP_TIMEZONE } from "./env";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY };

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Breaks an instant into the calendar fields a person in the given zone would read. */
export function zonedParts(date: Date, timeZone: string = APP_TIMEZONE): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((part) => part.type === type);
    return found ? Number(found.value) : 0;
  };
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** Offset of the zone from UTC, in milliseconds, at the given instant. */
function zoneOffset(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

/**
 * Midnight at the start of the calendar day that contains the given instant,
 * as seen in the given zone. Two passes handle zones that shift their offset,
 * which keeps day arithmetic correct outside Oman as well.
 */
export function startOfZonedDay(date: Date, timeZone: string = APP_TIMEZONE): Date {
  const parts = zonedParts(date, timeZone);
  const naiveMidnight = Date.UTC(parts.year, parts.month - 1, parts.day);
  const firstGuess = new Date(naiveMidnight - zoneOffset(date, timeZone));
  const corrected = new Date(naiveMidnight - zoneOffset(firstGuess, timeZone));
  return corrected;
}

/** Start of the next calendar day in the given zone. */
export function startOfNextZonedDay(date: Date, timeZone: string = APP_TIMEZONE): Date {
  const start = startOfZonedDay(date, timeZone);
  // 36 hours always lands inside the following day, whatever the offset change.
  return startOfZonedDay(new Date(start.getTime() + 36 * MS_PER_HOUR), timeZone);
}

/** Last millisecond of the calendar day in the given zone. */
export function endOfZonedDay(date: Date, timeZone: string = APP_TIMEZONE): Date {
  return new Date(startOfNextZonedDay(date, timeZone).getTime() - 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Whole calendar days from the day containing "from" to the day containing
 * "to". Positive when "to" is later. Used for due date wording, where a task
 * due tonight and a task due tomorrow morning should read differently even
 * though they are only hours apart.
 */
export function calendarDaysBetween(
  from: Date,
  to: Date,
  timeZone: string = APP_TIMEZONE,
): number {
  const fromStart = startOfZonedDay(from, timeZone).getTime();
  const toStart = startOfZonedDay(to, timeZone).getTime();
  return Math.round((toStart - fromStart) / MS_PER_DAY);
}

export function isSameZonedDay(a: Date, b: Date, timeZone: string = APP_TIMEZONE): boolean {
  return calendarDaysBetween(a, b, timeZone) === 0;
}

/* -------------------------------------------------------------------------- */
/*                               Overdue logic                                */
/* -------------------------------------------------------------------------- */

/**
 * Overdue is derived, never stored, so a task never carries a stale flag.
 * Completed and cancelled work is never overdue, however late it was finished.
 */
export function isOverdue(
  input: { dueDate: Date; status: string },
  now: Date = new Date(),
): boolean {
  if (input.status === "COMPLETED" || input.status === "CANCELLED") return false;
  return input.dueDate.getTime() < now.getTime();
}

/** True when the work was finished after its deadline. */
export function wasCompletedLate(input: {
  dueDate: Date;
  completedAt: Date | null;
}): boolean {
  if (!input.completedAt) return false;
  return input.completedAt.getTime() > input.dueDate.getTime();
}

export type DurationUnit = "hours" | "days" | "weeks" | "months";

export type ElapsedDuration = {
  unit: DurationUnit;
  value: number;
};

/**
 * Picks a single readable unit for how long something has been overdue or how
 * far away it is. Showing "overdue by 2 weeks" reads better than 15 days.
 */
export function describeElapsed(milliseconds: number): ElapsedDuration {
  const absolute = Math.abs(milliseconds);
  if (absolute < MS_PER_DAY) {
    return { unit: "hours", value: Math.max(1, Math.floor(absolute / MS_PER_HOUR)) };
  }
  const days = Math.floor(absolute / MS_PER_DAY);
  if (days < 14) return { unit: "days", value: days };
  if (days < 60) return { unit: "weeks", value: Math.floor(days / 7) };
  return { unit: "months", value: Math.floor(days / 30) };
}

/** How long a task has been overdue, measured from its due date to now. */
export function overdueDuration(dueDate: Date, now: Date = new Date()): ElapsedDuration {
  return describeElapsed(now.getTime() - dueDate.getTime());
}

/* -------------------------------------------------------------------------- */
/*                           Form value conversion                            */
/* -------------------------------------------------------------------------- */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Renders an instant as the yyyy-mm-dd value an input type=date expects, in app time. */
export function toDateInputValue(date: Date, timeZone: string = APP_TIMEZONE): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Renders an instant as the HH:mm value an input type=time expects, in app time. */
export function toTimeInputValue(date: Date, timeZone: string = APP_TIMEZONE): string {
  const parts = zonedParts(date, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

/**
 * Turns a date input value, and an optional time, into an instant. The values
 * are read as app local time, so a father in Muscat choosing 8 October gets
 * 8 October in Muscat regardless of where the server runs.
 *
 * Without a time, the deadline falls at the end of the chosen day, which is
 * what people mean by "due on the 8th".
 */
export function fromDateInputValue(
  dateValue: string,
  timeValue?: string | null,
  timeZone: string = APP_TIMEZONE,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let hour = 23;
  let minute = 59;
  if (timeValue && timeValue.trim()) {
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
    if (!timeMatch) return null;
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    if (hour > 23 || minute > 59) return null;
  }

  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstGuess = new Date(naive - zoneOffset(new Date(naive), timeZone));
  const result = new Date(naive - zoneOffset(firstGuess, timeZone));

  // Reject impossible calendar dates such as 31 February.
  const check = zonedParts(result, timeZone);
  if (check.year !== year || check.month !== month || check.day !== day) return null;

  return result;
}
