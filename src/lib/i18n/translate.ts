import { INTL_LOCALES, type Direction, type Locale, directionOf } from "./config";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";
import { isPluralSet, type Dictionary, type PluralSet } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  ar,
};

export type InterpolationValues = Record<string, string | number>;

/** Fills {name} placeholders. Unknown placeholders are left in place so gaps are visible. */
export function interpolate(template: string, values?: InterpolationValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

const pluralRulesCache = new Map<Locale, Intl.PluralRules>();

function pluralRules(locale: Locale): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(INTL_LOCALES[locale]);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

/**
 * Resolves a plural set for a count. Arabic distinguishes zero, one, two, few,
 * many and other, so the correct category is selected rather than guessed from
 * a simple count === 1 check.
 */
export function selectPlural(set: PluralSet, count: number, locale: Locale): string {
  if (count === 0 && set.zero) return set.zero;
  const category = pluralRules(locale).select(count) as keyof PluralSet;
  return set[category] ?? set.other;
}

export type Translator = {
  locale: Locale;
  dir: Direction;
  /** The active dictionary. Plain string keys are read directly, for example dict.nav.tasks. */
  dict: Dictionary;
  /** Fills placeholders in a dictionary string. */
  fmt: (template: string, values?: InterpolationValues) => string;
  /** Picks the right plural form and fills the {count} placeholder. */
  plural: (set: PluralSet, count: number, values?: InterpolationValues) => string;
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export function createTranslator(locale: Locale): Translator {
  const dict = getDictionary(locale);
  return {
    locale,
    dir: directionOf(locale),
    dict,
    fmt: (template, values) => interpolate(template, values),
    plural: (set, count, values) =>
      interpolate(selectPlural(set, count, locale), { count, ...values }),
  };
}

export { isPluralSet };
export type { Dictionary, PluralSet };
