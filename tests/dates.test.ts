import { describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  describeElapsed,
  endOfZonedDay,
  fromDateInputValue,
  isOverdue,
  overdueDuration,
  startOfZonedDay,
  toDateInputValue,
  wasCompletedLate,
  zonedParts,
} from "@/lib/dates";

/**
 * Tabea runs on Vercel, where the server clock is UTC, while the people using
 * it are in Muscat at UTC+4. Every date in the product is read and written in
 * application time, so these tests pin that behaviour down.
 */
const MUSCAT = "Asia/Muscat";

describe("application timezone handling", () => {
  it("reads an instant as the local calendar day in Muscat", () => {
    // 22:30 UTC is already the next morning in Muscat.
    const instant = new Date("2026-10-06T22:30:00Z");
    const parts = zonedParts(instant, MUSCAT);

    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(10);
    expect(parts.day).toBe(7);
    expect(parts.hour).toBe(2);
  });

  it("puts the start of the day at 20:00 UTC the evening before", () => {
    const instant = new Date("2026-10-07T06:00:00Z");
    expect(startOfZonedDay(instant, MUSCAT).toISOString()).toBe("2026-10-06T20:00:00.000Z");
  });

  it("ends the day one millisecond before the next one starts", () => {
    const instant = new Date("2026-10-07T06:00:00Z");
    expect(endOfZonedDay(instant, MUSCAT).toISOString()).toBe("2026-10-07T19:59:59.999Z");
  });

  it("counts calendar days rather than elapsed hours", () => {
    // Four hours apart, but two different days in Muscat.
    const lateEvening = new Date("2026-10-06T19:00:00Z");
    const earlyMorning = new Date("2026-10-06T21:00:00Z");
    expect(calendarDaysBetween(lateEvening, earlyMorning, MUSCAT)).toBe(1);
  });
});

describe("date input conversion", () => {
  it("treats a chosen date as a local day, not a UTC one", () => {
    // Choosing 8 October in Muscat must not become 7 October on the server.
    const result = fromDateInputValue("2026-10-08", null, MUSCAT);
    expect(result).not.toBeNull();
    expect(zonedParts(result!, MUSCAT).day).toBe(8);
  });

  it("defaults a date without a time to the end of that day", () => {
    const result = fromDateInputValue("2026-10-08", null, MUSCAT);
    const parts = zonedParts(result!, MUSCAT);
    expect(parts.hour).toBe(23);
    expect(parts.minute).toBe(59);
  });

  it("honours an explicit time", () => {
    const result = fromDateInputValue("2026-10-08", "09:30", MUSCAT);
    const parts = zonedParts(result!, MUSCAT);
    expect(parts.hour).toBe(9);
    expect(parts.minute).toBe(30);
  });

  it("rejects a date that does not exist", () => {
    expect(fromDateInputValue("2026-02-31", null, MUSCAT)).toBeNull();
    expect(fromDateInputValue("2026-13-01", null, MUSCAT)).toBeNull();
  });

  it("rejects a malformed value", () => {
    expect(fromDateInputValue("not-a-date", null, MUSCAT)).toBeNull();
    expect(fromDateInputValue("2026-10-08", "25:00", MUSCAT)).toBeNull();
  });

  it("round trips through the form value", () => {
    const original = fromDateInputValue("2026-10-08", "14:45", MUSCAT);
    expect(toDateInputValue(original!, MUSCAT)).toBe("2026-10-08");
  });
});

describe("overdue is derived, never stored", () => {
  const dueDate = new Date("2026-10-06T19:59:00Z");

  it("marks open work past its deadline as overdue", () => {
    const now = new Date("2026-10-08T06:00:00Z");
    expect(isOverdue({ dueDate, status: "NEW" }, now)).toBe(true);
    expect(isOverdue({ dueDate, status: "IN_PROGRESS" }, now)).toBe(true);
    expect(isOverdue({ dueDate, status: "WAITING" }, now)).toBe(true);
  });

  it("never marks finished work as overdue, however late it was", () => {
    const now = new Date("2026-11-01T06:00:00Z");
    expect(isOverdue({ dueDate, status: "COMPLETED" }, now)).toBe(false);
    expect(isOverdue({ dueDate, status: "CANCELLED" }, now)).toBe(false);
  });

  it("is not overdue before the deadline passes", () => {
    const now = new Date("2026-10-06T19:00:00Z");
    expect(isOverdue({ dueDate, status: "NEW" }, now)).toBe(false);
  });

  it("still records that finished work was late", () => {
    expect(
      wasCompletedLate({ dueDate, completedAt: new Date("2026-10-09T06:00:00Z") }),
    ).toBe(true);
    expect(
      wasCompletedLate({ dueDate, completedAt: new Date("2026-10-06T10:00:00Z") }),
    ).toBe(false);
    expect(wasCompletedLate({ dueDate, completedAt: null })).toBe(false);
  });
});

describe("readable durations", () => {
  it("uses hours inside the first day", () => {
    expect(describeElapsed(5 * 3_600_000)).toEqual({ unit: "hours", value: 5 });
  });

  it("uses days up to a fortnight", () => {
    expect(describeElapsed(3 * 86_400_000)).toEqual({ unit: "days", value: 3 });
  });

  it("switches to weeks rather than counting to twenty days", () => {
    expect(describeElapsed(15 * 86_400_000)).toEqual({ unit: "weeks", value: 2 });
  });

  it("switches to months for anything long overdue", () => {
    expect(describeElapsed(95 * 86_400_000)).toEqual({ unit: "months", value: 3 });
  });

  it("measures how long a task has been overdue", () => {
    const dueDate = new Date("2026-10-01T00:00:00Z");
    const now = new Date("2026-10-04T00:00:00Z");
    expect(overdueDuration(dueDate, now)).toEqual({ unit: "days", value: 3 });
  });
});
