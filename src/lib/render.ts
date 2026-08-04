/**
 * Shared between server queries and client components, so it must stay free of
 * server-only imports.
 */

export interface AnnotatedWord {
  pos: number;
  src_pos: number;
  language: string | null;
  original: string | null;
  translit: string | null;
  parsing: string | null;
  parsing_long: string | null;
  strongs: string | null;
  english: string | null;
  prefix: string | null;
  suffix: string | null;
  para: string | null;
  /** Printed editions attesting this word, on verses absent from the earliest
   *  manuscripts. Null elsewhere. */
  editions: string | null;
  /** From the joined lexicon entry — null when the word carries no Strong's. */
  lemma: string | null;
  gloss: string | null;
  definition: string | null;
  lemma_translit: string | null;
  occurrences: number | null;
}

export type ScriptLanguage = "hebrew" | "greek";

export function scriptOf(word: { language: string | null }): ScriptLanguage {
  return word.language === "Greek" ? "greek" : "hebrew";
}

export function scriptOfLanguage(language: string | null | undefined): ScriptLanguage {
  return language === "Greek" || language === "greek" ? "greek" : "hebrew";
}

/**
 * Markers the source uses for words that carry no English of their own:
 * `-` for an untranslated word, `vvv` and `. . .` where the English is supplied
 * by a neighbouring chunk. The dotted form is spaced, and the English column
 * contains no genuine ellipses, so a run of two or more dots is always a marker.
 */
const PLACEHOLDER_MARKS = /^(?:-|vvv|\.(?:\s*\.)+|[\s·•]+)$/i;

export function isEnglishPlaceholder(value: string | null | undefined): boolean {
  const text = value?.trim() ?? "";
  return text.length === 0 || PLACEHOLDER_MARKS.test(text);
}

/** Removes embedded markers, returning null when nothing meaningful is left. */
export function stripPlaceholderMarks(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = value
    .replace(/\.(?:\s*\.)+/g, " ")
    .replace(/\bvvv\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned && cleaned !== "-" ? cleaned : null;
}

export function hasEnglish(word: AnnotatedWord): boolean {
  return !isEnglishPlaceholder(word.english);
}

/**
 * The tables bracket words the translators supplied for English sense that have
 * no separate word in the original — `[His]` one and only Son, He `{will}`
 * crush. The published Berean text prints them plainly, so the markers are
 * presentation only.
 */
export interface TextSegment {
  text: string;
  supplied: boolean;
}

export function splitSupplied(value: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let index = 0;
  for (const match of value.matchAll(/[[{]([^\]}]*)[\]}]/g)) {
    if (match.index > index) {
      segments.push({ text: value.slice(index, match.index), supplied: false });
    }
    if (match[1]) segments.push({ text: match[1], supplied: true });
    index = match.index + match[0].length;
  }
  if (index < value.length) segments.push({ text: value.slice(index), supplied: false });
  return segments.filter((segment) => segment.text.length > 0);
}

export function stripSuppliedMarkers(value: string): string {
  return value.replace(/[[\]{}]/g, "");
}

export interface AlignedSegment {
  text: string;
  /** Index into the word array, or null for punctuation between words. */
  wordIndex: number | null;
  supplied: boolean;
}

/**
 * Lays the word chunks over the published verse text.
 *
 * The interlinear tables do not always record a closing quotation mark, so text
 * assembled purely from word chunks can differ from the published edition by a
 * character or two. The published text is therefore what gets displayed, and
 * each chunk is located within it by scanning forward — anything between two
 * chunks (punctuation, a quotation mark the tables omitted) renders as plain
 * text without a hover target.
 */
export function alignWordsToText(words: AnnotatedWord[], text: string): AlignedSegment[] {
  const segments: AlignedSegment[] = [];
  let cursor = 0;

  words.forEach((word, index) => {
    const raw = word.english?.trim();
    if (!raw || isEnglishPlaceholder(raw)) return;

    const supplied = /^[[{].*[\]}]$/.test(raw);
    const needle = stripSuppliedMarkers(raw).trim();
    if (!needle) return;

    const found = text.indexOf(needle, cursor);
    if (found < 0) return; // chunk not in the published wording; skip quietly

    if (found > cursor) {
      segments.push({ text: text.slice(cursor, found), wordIndex: null, supplied: false });
    }
    segments.push({ text: needle, wordIndex: index, supplied });
    cursor = found + needle.length;
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), wordIndex: null, supplied: false });
  }
  return segments;
}

/**
 * The Berean text closes its em-dashes up against the surrounding words, while
 * the source column pads them with spaces.
 */
export function normalizeDashes(value: string): string {
  return value.replace(/\s*—\s*/g, "—");
}

export interface DisplayPiece {
  /** Index into the original word array, for hover targeting. */
  index: number;
  word: AnnotatedWord;
  prefix: string;
  text: string;
  suffix: string;
  /** Set when the source marks a new poetic line or paragraph at this word. */
  breakBefore: boolean;
  indent: number;
}

const HUGS_PREVIOUS = /^[,.;:!?”’)\]]/;

/** Poetry classes from the source, mapped to indent levels. */
function indentFor(para: string | null): number {
  if (!para) return 0;
  if (para.startsWith("indent2") || para === "indentred2") return 2;
  if (para.startsWith("indent1") || para === "indentred1" || para.startsWith("list")) return 1;
  if (para === "selah") return 3;
  return 0;
}

function startsNewLine(para: string | null): boolean {
  if (!para) return false;
  return (
    para.startsWith("indent") ||
    para.startsWith("list") ||
    para === "selah" ||
    para === "tab1stline"
  );
}

/**
 * Turns the word rows into renderable chunks. Words with no English of their
 * own still contribute their punctuation and quote marks, which get folded onto
 * the neighbouring chunk so nothing is lost from the sentence.
 */
export function buildDisplayPieces(words: AnnotatedWord[]): DisplayPiece[] {
  const pieces: DisplayPiece[] = [];
  let pendingPrefix = "";

  words.forEach((word, index) => {
    const english = word.english?.trim() ?? "";
    const visible = !isEnglishPlaceholder(english);
    const prefix = word.prefix ?? "";
    const suffix = word.suffix ?? "";

    if (visible) {
      pieces.push({
        index,
        word,
        // An opening mark hugs the word that follows it.
        prefix: `${pendingPrefix}${prefix}`.replace(/\s+$/, ""),
        text: english,
        suffix: HUGS_PREVIOUS.test(suffix.trim()) ? suffix.trimStart() : suffix,
        breakBefore: pieces.length > 0 && startsNewLine(word.para),
        indent: indentFor(word.para),
      });
      pendingPrefix = "";
    } else {
      pendingPrefix += prefix;
      if (suffix && pieces.length > 0) {
        const last = pieces[pieces.length - 1];
        last.suffix += HUGS_PREVIOUS.test(suffix.trim()) ? suffix.trimStart() : suffix;
      } else {
        pendingPrefix += suffix;
      }
    }
  });

  if (pendingPrefix.trim() && pieces.length > 0) {
    pieces[pieces.length - 1].suffix += pendingPrefix;
  }
  return pieces;
}

/** "V-Qal-Imperf-2ms" is terse; the long form is the readable one. */
export function describeParsing(word: {
  parsing: string | null;
  parsing_long: string | null;
}): string | null {
  const long = word.parsing_long?.trim();
  const short = word.parsing?.trim();
  return long || short || null;
}

/**
 * The Tyndale lexicons encode part of speech as `Language:Type-Gender-Extra`,
 * e.g. `H:A` (Hebrew adjective) or `N:N-M-P` (a man's name). Decoded here so
 * the term page can show words rather than codes.
 */
const MORPH_TYPE: Record<string, string> = {
  A: "adjective",
  Adv: "adverb",
  Art: "article",
  Cond: "conditional",
  Conj: "conjunction",
  Cor: "correlative",
  DemP: "demonstrative pronoun",
  ImpP: "impersonal pronoun",
  Intg: "interrogative",
  Intj: "interjection",
  N: "noun",
  Neg: "negative",
  Part: "particle",
  Prep: "preposition",
  PerP: "personal pronoun",
  PosP: "possessive pronoun",
  RefP: "reflexive pronoun",
  RelP: "relative pronoun",
  V: "verb",
};

const MORPH_LANGUAGE: Record<string, string> = {
  H: "Hebrew",
  A: "Aramaic",
  G: "Greek",
  N: "name",
};

const MORPH_GENDER: Record<string, string> = {
  F: "feminine",
  M: "masculine",
  N: "neuter",
  C: "common",
};

const MORPH_EXTRA: Record<string, string> = {
  L: "place",
  P: "person",
  LG: "gentilic",
  PG: "gentilic",
  G: "gentilic",
  T: "title",
};

export function describeMorph(morph: string | null): string | null {
  if (!morph) return null;
  const [languageCode, rest] = morph.split(":");
  if (!rest) return morph;

  const [typeCode, ...modifiers] = rest.split("-");
  const language = MORPH_LANGUAGE[languageCode];
  const type = MORPH_TYPE[typeCode];
  if (!type) return morph;

  const qualifiers: string[] = [];
  for (const modifier of modifiers) {
    if (!modifier) continue;
    // Gender codes may carry a trailing S or P for number, e.g. "MP".
    const gender = MORPH_GENDER[modifier[0]];
    const number = modifier.length > 1 ? (modifier[1] === "P" ? "plural" : "singular") : null;
    if (gender) {
      qualifiers.push(number ? `${gender} ${number}` : gender);
    } else if (MORPH_EXTRA[modifier]) {
      qualifiers.push(MORPH_EXTRA[modifier]);
    }
  }

  const head = languageCode === "N" ? `Proper noun` : type[0].toUpperCase() + type.slice(1);
  const detail = qualifiers.length ? ` — ${qualifiers.join(", ")}` : "";
  const suffix = language && languageCode !== "N" ? ` (${language})` : "";
  return `${head}${detail}${suffix}`;
}

export function strongsLanguage(strongs: string | null | undefined): ScriptLanguage | null {
  if (!strongs) return null;
  return strongs.startsWith("G") ? "greek" : "hebrew";
}
