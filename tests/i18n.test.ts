import { describe, expect, it } from "vitest";
import { DIRECTIONS, LOCALES, directionOf, isLocale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";
import { createTranslator, interpolate, selectPlural } from "@/lib/i18n/translate";
import { isPluralSet } from "@/lib/i18n/types";
import { formatDate, formatDateTime, formatNumber } from "@/lib/i18n/format";
import { activityActionEnum } from "@/db/schema";

/**
 * Arabic is a first class language in Tabea, not a translation layer bolted on
 * afterwards. The type system already guarantees that both dictionaries carry
 * the same keys; these tests cover what types cannot: the shape of the plural
 * sets, the grammar behind them, and that nothing was left in English.
 */

type Node = string | { [key: string]: Node };

function walk(
  value: Node,
  path: string[],
  visit: (path: string[], value: string) => void,
): void {
  if (typeof value === "string") {
    visit(path, value);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    walk(child as Node, [...path, key], visit);
  }
}

function collectLeaves(dictionary: unknown): Map<string, string> {
  const leaves = new Map<string, string>();
  walk(dictionary as Node, [], (path, value) => {
    leaves.set(path.join("."), value);
  });
  return leaves;
}

describe("locales", () => {
  it("offers exactly English and Arabic", () => {
    expect([...LOCALES]).toEqual(["en", "ar"]);
  });

  it("gives Arabic a right to left document direction", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
    expect(DIRECTIONS.ar).toBe("rtl");
  });

  it("rejects anything that is not a supported locale", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("dictionary completeness", () => {
  const english = collectLeaves(en);
  const arabic = collectLeaves(ar);

  it("translates every English key into Arabic", () => {
    const missing = [...english.keys()].filter((key) => {
      // Plural sets legitimately differ: Arabic fills in categories English
      // does not use, so only the presence of the set itself is compared here.
      const isPluralVariant = /\.(zero|one|two|few|many|other)$/.test(key);
      if (isPluralVariant) return false;
      return !arabic.has(key);
    });

    expect(missing).toEqual([]);
  });

  it("leaves no empty strings in either language", () => {
    for (const [key, value] of english) {
      expect(value.trim(), `en.${key} is empty`).not.toBe("");
    }
    for (const [key, value] of arabic) {
      expect(value.trim(), `ar.${key} is empty`).not.toBe("");
    }
  });

  it("keeps the same placeholders in both languages", () => {
    const placeholdersOf = (value: string): string[] =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort();

    for (const [key, value] of english) {
      const translated = arabic.get(key);
      if (!translated) continue;

      const expected = placeholdersOf(value);
      const actual = placeholdersOf(translated);

      // A plural form may legitimately drop the numeral, because Arabic says
      // "one task" and "two tasks" in the noun itself. It must never introduce
      // a placeholder that has no value to fill it.
      if (/\.(zero|one|two|few|many|other)$/.test(key)) {
        for (const placeholder of actual) {
          expect(expected, `unknown placeholder at ${key}`).toContain(placeholder);
        }
        continue;
      }

      expect(actual, `placeholders differ at ${key}`).toEqual(expected);
    }
  });

  it("does not leave Latin text where Arabic is expected", () => {
    // The brand name, phone examples and digits are intentionally Latin.
    const allowed = /^[\s\d+.,:()\-·%/]*$/;
    const suspicious: string[] = [];

    for (const [key, value] of arabic) {
      const hasArabic = /[؀-ۿ]/.test(value);
      if (hasArabic || allowed.test(value)) continue;
      suspicious.push(`${key}: ${value}`);
    }

    expect(suspicious).toEqual([]);
  });
});

describe("Arabic plural rules", () => {
  const set = ar.common.tasksCount;

  it("is recognised as a plural set", () => {
    expect(isPluralSet(set)).toBe(true);
    expect(isPluralSet(ar.common.save)).toBe(false);
  });

  it("selects the six Arabic categories correctly", () => {
    // Arabic distinguishes zero, one, two, a few, many and the rest, which is
    // why a simple count === 1 check is not good enough.
    expect(selectPlural(set, 0, "ar")).toBe("لا مهام");
    expect(selectPlural(set, 1, "ar")).toBe("مهمة واحدة");
    expect(selectPlural(set, 2, "ar")).toBe("مهمتان");
    expect(selectPlural(set, 5, "ar")).toBe("{count} مهام");
    expect(selectPlural(set, 15, "ar")).toBe("{count} مهمة");
  });

  it("uses the two English categories", () => {
    expect(selectPlural(en.common.tasksCount, 1, "en")).toBe("{count} task");
    expect(selectPlural(en.common.tasksCount, 3, "en")).toBe("{count} tasks");
  });

  it("fills the count through the translator", () => {
    const arabic = createTranslator("ar");
    const english = createTranslator("en");

    expect(english.plural(english.dict.common.tasksCount, 3)).toBe("3 tasks");
    expect(arabic.plural(arabic.dict.common.tasksCount, 5)).toBe("5 مهام");
    expect(arabic.plural(arabic.dict.common.tasksCount, 2)).toBe("مهمتان");
  });
});

describe("interpolation", () => {
  it("replaces named placeholders", () => {
    expect(interpolate("Due {date}", { date: "6 Oct 2026" })).toBe("Due 6 Oct 2026");
  });

  it("leaves an unknown placeholder visible rather than printing undefined", () => {
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
  });

  it("handles numbers", () => {
    expect(interpolate("{count} left", { count: 4 })).toBe("4 left");
  });
});

describe("date and number formatting", () => {
  const instant = new Date("2026-10-06T12:15:00Z");

  it("formats dates in the application timezone", () => {
    // 12:15 UTC is 16:15 in Muscat, so the day must still read as 6 October.
    expect(formatDate(instant, "en")).toContain("2026");
    expect(formatDate(instant, "en")).toContain("6");
    // Twelve hour, in both languages, matching how a deadline is read aloud.
    expect(formatDateTime(instant, "en")).toMatch(/4:15\s?(pm|PM)/);
    expect(formatDateTime(instant, "ar")).toMatch(/4:15/);
  });

  it("writes Arabic numbers in Latin digits, which is how they are read in the Gulf", () => {
    expect(formatNumber(1234, "ar")).toBe("1,234");
    expect(formatDate(instant, "ar")).toMatch(/2026/);
  });
});

describe("activity templates", () => {
  // Derived from the schema rather than an exclusion list, so adding a new
  // action fails here until both languages describe it.
  const actions = activityActionEnum.enumValues;

  it("has a sentence for every recorded action, in both languages", () => {
    for (const action of actions) {
      expect(en.activity, `en is missing ${action}`).toHaveProperty(action);
      expect(ar.activity, `ar is missing ${action}`).toHaveProperty(action);
    }
  });

  it("names an actor in every activity sentence", () => {
    for (const action of actions) {
      expect(
        en.activity[action],
        `en.activity.${action} does not name the actor`,
      ).toContain("{actor}");
      expect(
        ar.activity[action],
        `ar.activity.${action} does not name the actor`,
      ).toContain("{actor}");
    }
  });
});
