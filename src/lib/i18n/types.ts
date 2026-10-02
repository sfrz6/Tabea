import type { en } from "./dictionaries/en";

/**
 * A plural set. Arabic uses six categories, English only two, so every locale
 * may fill in exactly the categories its grammar needs as long as "other" is
 * present as the fallback.
 */
export type PluralSet = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

/**
 * Widens the literal types produced by "as const" in the English dictionary so
 * other locales can supply their own text while keeping the exact same keys.
 * Objects carrying an "other" key are treated as plural sets.
 */
type Translated<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralSet
    : { [K in keyof T]: Translated<T[K]> };

export type Dictionary = Translated<typeof en>;

export function isPluralSet(value: unknown): value is PluralSet {
  return (
    typeof value === "object" &&
    value !== null &&
    "other" in value &&
    typeof (value as PluralSet).other === "string"
  );
}
