import { APP_TIMEZONE } from "../env";
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  calendarDaysBetween,
  describeElapsed,
  type ElapsedDuration,
} from "../dates";
import { INTL_LOCALES, type Locale } from "./config";
import type { Translator } from "./translate";

type FormatterKind = "date" | "dateTime" | "time" | "dayMonth" | "weekday" | "monthYear";

/**
 * Times are written in the twelve hour form in both languages. Arabic already
 * does this by default; British English would otherwise print 17:00, which is
 * not how people here read a deadline aloud.
 */
const OPTIONS: Record<FormatterKind, Intl.DateTimeFormatOptions> = {
  date: { day: "numeric", month: "short", year: "numeric" },
  dateTime: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
  time: { hour: "numeric", minute: "2-digit", hour12: true },
  dayMonth: { day: "numeric", month: "short" },
  weekday: { weekday: "long" },
  monthYear: { month: "long", year: "numeric" },
};

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: Locale, kind: FormatterKind): Intl.DateTimeFormat {
  const key = `${locale}:${kind}`;
  let found = cache.get(key);
  if (!found) {
    found = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
      ...OPTIONS[kind],
      timeZone: APP_TIMEZONE,
    });
    cache.set(key, found);
  }
  return found;
}

/** 6 Oct 2026 */
export function formatDate(date: Date, locale: Locale): string {
  return formatter(locale, "date").format(date);
}

/** 6 Oct 2026, 4:15 PM */
export function formatDateTime(date: Date, locale: Locale): string {
  return formatter(locale, "dateTime").format(date);
}

/** 4:15 PM */
export function formatTime(date: Date, locale: Locale): string {
  return formatter(locale, "time").format(date);
}

/** 6 Oct */
export function formatDayMonth(date: Date, locale: Locale): string {
  return formatter(locale, "dayMonth").format(date);
}

export function formatWeekday(date: Date, locale: Locale): string {
  return formatter(locale, "weekday").format(date);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale]).format(value);
}

/**
 * Turns a duration into words, for example "3 days" or "2 weeks", using the
 * plural rules of the active language.
 */
export function formatDuration(duration: ElapsedDuration, t: Translator): string {
  const { dict, plural } = t;
  switch (duration.unit) {
    case "hours":
      return plural(dict.time.hours, duration.value);
    case "days":
      return plural(dict.time.days, duration.value);
    case "weeks":
      return plural(dict.time.weeks, duration.value);
    case "months":
      return plural(dict.time.months, duration.value);
  }
}

/** Overdue by 3 days */
export function formatOverdue(dueDate: Date, t: Translator, now: Date = new Date()): string {
  const elapsed = now.getTime() - dueDate.getTime();
  if (elapsed < MS_PER_DAY) {
    return t.fmt(t.dict.tasks.overdueBy, { duration: t.dict.time.lessThanADay });
  }
  return t.fmt(t.dict.tasks.overdueBy, {
    duration: formatDuration(describeElapsed(elapsed), t),
  });
}

/**
 * Human wording for a deadline. Today and tomorrow are named rather than
 * dated, because that is how people speak about near deadlines.
 */
export function formatDueLabel(dueDate: Date, t: Translator, now: Date = new Date()): string {
  const days = calendarDaysBetween(now, dueDate);
  if (days === 0) return t.dict.tasks.dueToday;
  if (days === 1) return t.dict.tasks.dueTomorrow;
  return t.fmt(t.dict.tasks.due, { date: formatDate(dueDate, t.locale) });
}

/** Short relative wording for timeline entries, for example "2 hours ago". */
export function formatRelativeTime(date: Date, t: Translator, now: Date = new Date()): string {
  const { dict, plural } = t;
  const elapsed = now.getTime() - date.getTime();

  if (elapsed < 60 * 1000) return dict.time.justNow;
  if (elapsed < MS_PER_HOUR) {
    return plural(dict.time.minutesAgo, Math.floor(elapsed / MS_PER_MINUTE));
  }
  if (elapsed < MS_PER_DAY) {
    return plural(dict.time.hoursAgo, Math.floor(elapsed / MS_PER_HOUR));
  }

  const days = Math.floor(elapsed / MS_PER_DAY);
  if (days < 7) return plural(dict.time.daysAgo, days);
  if (days < 31) return plural(dict.time.weeksAgo, Math.floor(days / 7));
  if (days < 365) return plural(dict.time.monthsAgo, Math.floor(days / 30));
  return plural(dict.time.yearsAgo, Math.floor(days / 365));
}

/**
 * Timeline heading for a day: "Today", "Yesterday" or the full date. Keeps the
 * activity history readable without repeating the date on every entry.
 */
export function formatDayHeading(date: Date, t: Translator, now: Date = new Date()): string {
  const days = calendarDaysBetween(date, now);
  if (days === 0) return t.dict.time.today;
  if (days === 1) return t.dict.time.yesterday;
  return formatDate(date, t.locale);
}
