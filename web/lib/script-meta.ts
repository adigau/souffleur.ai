export const SCRIPT_TYPE_VALUES = [
  { value: "theater_play", label: "Theater play" },
  { value: "movie",        label: "Movie" },
  { value: "short_film",   label: "Short film" },
  { value: "tv_episode",   label: "TV episode" },
  { value: "sitcom",       label: "Sitcom" },
  { value: "musical",      label: "Musical" },
  { value: "opera",        label: "Opera" },
  { value: "monologue",    label: "Monologue" },
  { value: "radio_drama",  label: "Radio / Audio drama" },
] as const;

export const CATEGORY_VALUES = [
  { value: "drama",       label: "Drama" },
  { value: "comedy",      label: "Comedy" },
  { value: "tragedy",     label: "Tragedy" },
  { value: "tragicomedy", label: "Tragicomedy" },
  { value: "romance",     label: "Romance" },
  { value: "thriller",    label: "Thriller" },
  { value: "horror",      label: "Horror" },
  { value: "crime",       label: "Crime" },
  { value: "historical",  label: "Historical" },
  { value: "fantasy",     label: "Fantasy" },
  { value: "sci_fi",      label: "Sci-fi" },
  { value: "action",      label: "Action" },
  { value: "satire",      label: "Satire" },
  { value: "farce",       label: "Farce" },
  { value: "musical",     label: "Musical" },
  { value: "other",       label: "Other" },
] as const;

export const LANGUAGE_VALUES = [
  { value: "en",    label: "English" },
  { value: "fr",    label: "French" },
  { value: "de",    label: "German" },
  { value: "es",    label: "Spanish" },
  { value: "it",    label: "Italian" },
  { value: "pt",    label: "Portuguese" },
  { value: "ru",    label: "Russian" },
  { value: "nl",    label: "Dutch" },
  { value: "ja",    label: "Japanese" },
  { value: "zh",    label: "Chinese" },
  { value: "ar",    label: "Arabic" },
  { value: "other", label: "Other" },
] as const;

export type ScriptTypeValue = typeof SCRIPT_TYPE_VALUES[number]["value"];
export type CategoryValue   = typeof CATEGORY_VALUES[number]["value"];
export type LanguageValue   = typeof LANGUAGE_VALUES[number]["value"];

export function scriptTypeLabel(v: string | null | undefined): string | null {
  return SCRIPT_TYPE_VALUES.find((x) => x.value === v)?.label ?? null;
}
export function categoryLabel(v: string | null | undefined): string | null {
  return CATEGORY_VALUES.find((x) => x.value === v)?.label ?? null;
}
export function languageLabel(v: string | null | undefined): string | null {
  return LANGUAGE_VALUES.find((x) => x.value === v)?.label ?? null;
}
