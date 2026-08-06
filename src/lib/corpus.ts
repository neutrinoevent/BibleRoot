import "server-only";

import { BOOKS_BY_ID, type BookMeta } from "./books";
import { queryAll, queryOne } from "./db";
import { isEnglishPlaceholder, stripSuppliedMarkers, type AnnotatedWord } from "./render";

export type { AnnotatedWord };

export interface Verse {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  ref: string;
  text: string;
  heading: string | null;
  crossref: string | null;
  footnote: string | null;
  /** Set when the verse is absent from the earliest manuscripts. */
  disputed: string | null;
}

export interface Word {
  id: number;
  verse_id: number;
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
  editions: string | null;
}

export interface StrongsEntry {
  id: string;
  language: "hebrew" | "greek";
  number: number;
  lemma: string | null;
  translit: string | null;
  pronunciation: string | null;
  gloss: string | null;
  morph: string | null;
  derivation: string | null;
  definition: string | null;
  kjv_usage: string | null;
  twot: string | null;
  occurrences: number;
}

export interface DeepLexiconEntry {
  strongs: string;
  source: "bdb" | "abbott-smith";
  headword: string | null;
  citation: string | null;
  /** Pre-sanitised at import time; safe to render directly. */
  html: string;
}

const LEXICON_TITLES: Record<string, { title: string; attribution: string }> = {
  bdb: {
    title: "Brown-Driver-Briggs",
    attribution: "A Hebrew and English Lexicon of the Old Testament (1906)",
  },
  "abbott-smith": {
    title: "Abbott-Smith",
    attribution: "A Manual Greek Lexicon of the New Testament (1922)",
  },
};

export function lexiconTitle(source: string): { title: string; attribution: string } {
  return LEXICON_TITLES[source] ?? { title: source, attribution: "" };
}

/**
 * The inseparable prefixes and particles — the article, the conjunctive waw, the
 * prepositions bet, lamed, kaf and min, the interrogative he and the relative
 * she. Strong's never numbered them, so the lexical index names them by letter
 * and they are keyed here as `HB`, `HD` and so on rather than by a number they
 * do not have.
 */
export interface Particle {
  id: string;
  letter: string;
  headword: string | null;
  citation: string | null;
  html: string;
}

export function getParticle(letter: string): Particle | null {
  if (!/^[a-z]$/i.test(letter)) return null;
  const id = `H${letter.toUpperCase()}`;
  const row = queryOne<{ headword: string | null; citation: string | null; html: string }>(
    "SELECT headword, citation, html FROM lexicon_entries WHERE strongs = ? AND source = 'bdb'",
    [id],
  );
  return row ? { id, letter: letter.toLowerCase(), ...row } : null;
}

export function listParticles(): Particle[] {
  return queryAll<{ strongs: string; headword: string | null; citation: string | null; html: string }>(
    "SELECT strongs, headword, citation, html FROM lexicon_entries WHERE strongs GLOB 'H[A-Z]' ORDER BY strongs",
  ).map((row) => ({
    id: row.strongs,
    letter: row.strongs.slice(1).toLowerCase(),
    headword: row.headword,
    citation: row.citation,
    html: row.html,
  }));
}

/** Full scholarly entries — BDB for Hebrew, Abbott-Smith for Greek. */
export function getDeepLexiconEntries(strongs: string): DeepLexiconEntry[] {
  return queryAll<DeepLexiconEntry>(
    "SELECT strongs, source, headword, citation, html FROM lexicon_entries WHERE strongs = ? ORDER BY source",
    [strongs],
  );
}

export interface Occurrence {
  ref: string;
  book_id: number;
  chapter: number;
  verse: number;
  english: string | null;
  original: string | null;
  translit: string | null;
  parsing: string | null;
  text: string;
}

export function getVerse(bookId: number, chapter: number, verse: number): Verse | null {
  return queryOne<Verse>(
    "SELECT * FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?",
    [bookId, chapter, verse],
  );
}

export function getVerseById(id: number): Verse | null {
  return queryOne<Verse>("SELECT * FROM verses WHERE id = ?", [id]);
}

export function getWords(verseId: number): Word[] {
  return queryAll<Word>("SELECT * FROM words WHERE verse_id = ? ORDER BY pos", [verseId]);
}

/**
 * Words joined to their lexicon entry, so a hover card has everything it needs
 * without a second round trip.
 */
export function getAnnotatedWords(verseId: number): AnnotatedWord[] {
  return queryAll<AnnotatedWord>(
    `SELECT w.pos, w.src_pos, w.language, w.original, w.translit, w.parsing,
            w.parsing_long, w.strongs, w.english, w.prefix, w.suffix, w.para, w.editions,
            s.lemma, s.gloss, s.definition, s.translit AS lemma_translit,
            s.occurrences
       FROM words w
       LEFT JOIN strongs s ON s.id = w.strongs
      WHERE w.verse_id = ?
      ORDER BY w.pos`,
    [verseId],
  );
}

/** Which of the given Strong's ids actually have an entry. */
export function existingStrongs(ids: string[]): Set<string> {
  if (ids.length === 0) return new Set();
  const placeholders = ids.map(() => "?").join(", ");
  const rows = queryAll<{ id: string }>(
    `SELECT id FROM strongs WHERE id IN (${placeholders})`,
    ids,
  );
  return new Set(rows.map((row) => row.id));
}

export interface SeptuagintMatch {
  strongs: string;
  lemma: string | null;
  translit: string | null;
  gloss: string | null;
  language: "hebrew" | "greek";
  /** Abbott-Smith's own spelling, used when our lexicon has no lemma. */
  printed: string | null;
}

/**
 * The Hebrew words a Greek word was used to translate in the Septuagint.
 *
 * Recorded by Abbott-Smith from the Greek side, so this direction is the one the
 * source actually documents.
 */
export function septuagintBehindGreek(greek: string): SeptuagintMatch[] {
  return queryAll<SeptuagintMatch>(
    `SELECT l.hebrew AS strongs, l.hebrew_word AS printed,
            s.lemma, s.translit, s.gloss, s.language
       FROM septuagint l
       LEFT JOIN strongs s ON s.id = l.hebrew
      WHERE l.greek = ?
      ORDER BY s.occurrences DESC`,
    [greek],
  );
}

/**
 * The Greek words the Septuagint used for a Hebrew word.
 *
 * Read back out of the same Greek-side notes, so it reaches only Greek words
 * that also occur in the New Testament.
 */
export function septuagintRenderingsOf(hebrew: string): SeptuagintMatch[] {
  return queryAll<SeptuagintMatch>(
    `SELECT l.greek AS strongs, NULL AS printed,
            s.lemma, s.translit, s.gloss, s.language
       FROM septuagint l
       LEFT JOIN strongs s ON s.id = l.greek
      WHERE l.hebrew = ?
      ORDER BY s.occurrences DESC`,
    [hebrew],
  );
}

export function getStrongs(id: string): StrongsEntry | null {
  return queryOne<StrongsEntry>("SELECT * FROM strongs WHERE id = ?", [id]);
}

/** Every other place the same lexical root is used — the concordance view. */
export function getOccurrences(
  strongsId: string,
  limit: number,
  offset = 0,
  bookId?: number,
): Occurrence[] {
  const inBook = bookId ? "AND v.book_id = ?" : "";
  const params: Array<string | number> = bookId ? [strongsId, bookId] : [strongsId];
  return queryAll<Occurrence>(
    `SELECT v.ref, v.book_id, v.chapter, v.verse, v.text,
            w.english, w.original, w.translit, w.parsing
       FROM words w
       JOIN verses v ON v.id = w.verse_id
      WHERE w.strongs = ? ${inBook}
      ORDER BY v.id, w.pos
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
}

export interface InflectedForm {
  original: string;
  translit: string | null;
  parsing: string | null;
  parsing_long: string | null;
  c: number;
}

/**
 * Every word in the text is an inflected form; the lexicon files them under a
 * single dictionary form. ἡμῶν, μου and με all belong to ἐγώ, so a term page
 * needs to show the forms as well as the headword.
 */
export function getInflectedForms(strongsId: string): InflectedForm[] {
  const rows = queryAll<InflectedForm>(
    `SELECT original,
            MIN(translit)     AS translit,
            MIN(parsing)      AS parsing,
            MIN(parsing_long) AS parsing_long,
            COUNT(*)          AS c
       FROM words
      WHERE strongs = ? AND original IS NOT NULL
      GROUP BY original
      ORDER BY c DESC`,
    [strongsId],
  );

  // A word starting a sentence is capitalised, which SQLite's ASCII-only
  // lower() will not fold for Greek or Hebrew. Merge those here so the same
  // form does not appear twice, keeping the commonest spelling as the label.
  const merged = new Map<string, InflectedForm>();
  for (const row of rows) {
    const key = `${row.original.toLowerCase()}|${row.parsing ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.c += row.c;
    else merged.set(key, { ...row });
  }
  return [...merged.values()].sort((a, b) => b.c - a.c);
}

/**
 * A single inflected form. Matched case-insensitively, because a word opening a
 * sentence is capitalised and SQLite's lower() does not fold Greek or Hebrew —
 * so the fold happens here, over the small set of forms for one root.
 */
export function getForm(strongsId: string, original: string): InflectedForm | null {
  const target = original.toLowerCase();
  return getInflectedForms(strongsId).find((form) => form.original.toLowerCase() === target) ?? null;
}

/** Kept for the arrival note on the lemma page. */
export const describeForm = getForm;

/** Occurrences of one inflected form, rather than of the whole root. */
export function getFormOccurrences(
  strongsId: string,
  original: string,
  limit: number,
): Occurrence[] {
  return queryAll<Occurrence>(
    `SELECT v.ref, v.book_id, v.chapter, v.verse, v.text,
            w.english, w.original, w.translit, w.parsing
       FROM words w
       JOIN verses v ON v.id = w.verse_id
      WHERE w.strongs = ? AND w.original = ? COLLATE NOCASE
      ORDER BY v.id, w.pos
      LIMIT ?`,
    [strongsId, original, limit],
  );
}

export interface Rendering {
  english: string;
  c: number;
}

/**
 * How the translators rendered this form, and how often. Seeing one Hebrew word
 * carried into English a dozen different ways is often the point of the study.
 */
export function getRenderings(
  strongsId: string,
  original?: string,
  limit = 30,
): Rendering[] {
  const rows = original
    ? queryAll<Rendering>(
        `SELECT english, COUNT(*) AS c
           FROM words
          WHERE strongs = ? AND original = ? COLLATE NOCASE AND english IS NOT NULL
          GROUP BY english ORDER BY c DESC LIMIT ?`,
        [strongsId, original, limit * 3],
      )
    : queryAll<Rendering>(
        `SELECT english, COUNT(*) AS c
           FROM words
          WHERE strongs = ? AND english IS NOT NULL
          GROUP BY english ORDER BY c DESC LIMIT ?`,
        [strongsId, limit * 3],
      );

  // Stripping the supplied-word brackets collapses "[it]" and "it" onto the
  // same wording, so the counts have to be merged rather than listed twice.
  const merged = new Map<string, number>();
  for (const row of rows) {
    if (isEnglishPlaceholder(row.english)) continue;
    const english = stripSuppliedMarkers(row.english).trim();
    if (!english) continue;
    merged.set(english, (merged.get(english) ?? 0) + row.c);
  }

  return [...merged.entries()]
    .map(([english, c]) => ({ english, c }))
    .sort((a, b) => b.c - a.c)
    .slice(0, limit);
}

export interface SharedRoot {
  strongs: string;
  lemma: string | null;
  translit: string | null;
  gloss: string | null;
  language: "hebrew" | "greek";
  /** How many of the selected verses contain it. */
  verses: number;
  /** Total instances across the selection. */
  total: number;
  /** One surface form, for linking straight to a form page. */
  sample: string | null;
}

/**
 * Roots occurring in more than one of the selected verses.
 *
 * When several verses are opened together the interesting question is what
 * holds them together, so this is what the selection view leads with. Articles
 * and conjunctions would swamp it, so roots appearing in every verse but
 * carrying no lexical weight are filtered out by their part of speech.
 */
export function getSharedRoots(verseIds: number[]): SharedRoot[] {
  if (verseIds.length < 2) return [];
  const placeholders = verseIds.map(() => "?").join(", ");

  const rows = queryAll<SharedRoot & { morph: string | null }>(
    `SELECT w.strongs,
            s.lemma, s.translit, s.gloss, s.language, s.morph,
            COUNT(DISTINCT w.verse_id) AS verses,
            COUNT(*)                   AS total,
            MIN(w.original)            AS sample
       FROM words w
       JOIN strongs s ON s.id = w.strongs
      WHERE w.verse_id IN (${placeholders}) AND w.strongs IS NOT NULL
      GROUP BY w.strongs
     HAVING COUNT(DISTINCT w.verse_id) > 1
      ORDER BY verses DESC, total DESC`,
    verseIds,
  );

  /**
   * Grammatical glue, by the part of speech recorded in the lexicon. The Greek
   * and Hebrew entries use different abbreviations, so both are spelled out.
   * Verbs, nouns, adjectives, adverbs and proper names are all kept — a name
   * shared between two verses is worth seeing.
   */
  const FUNCTION_WORDS =
    /^(?:Prefix$|[GA]:(?:PREP|PRT-N|PRT|CONJ|COND|INJ|T|P-\d|P)(?:$|[-\s])|H:(?:Prep|Part|Neg|Conj|RelP|DemP|PerP|PosP|RefP|Art|Intj|Cond)(?:$|[-\s]))/i;

  return rows
    .filter((row) => !row.morph || !FUNCTION_WORDS.test(row.morph))
    .map((row) => ({
      strongs: row.strongs,
      lemma: row.lemma,
      translit: row.translit,
      gloss: row.gloss,
      language: row.language,
      verses: row.verses,
      total: row.total,
      sample: row.sample,
    }));
}

/** Book distribution for one inflected form, as the root page has for the root. */
export function getFormSpread(
  strongsId: string,
  original: string,
): Array<{ book_id: number; c: number }> {
  return queryAll<{ book_id: number; c: number }>(
    `SELECT v.book_id, COUNT(*) AS c
       FROM words w JOIN verses v ON v.id = w.verse_id
      WHERE w.strongs = ? AND w.original = ? COLLATE NOCASE
      GROUP BY v.book_id
      ORDER BY c DESC`,
    [strongsId, original],
  );
}

export function countFormOccurrences(strongsId: string, original: string): number {
  return (
    queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM words WHERE strongs = ? AND original = ? COLLATE NOCASE",
      [strongsId, original],
    )?.c ?? 0
  );
}

export function countOccurrences(strongsId: string, bookId?: number): number {
  if (!bookId) {
    return (
      queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM words WHERE strongs = ?", [strongsId])
        ?.c ?? 0
    );
  }
  return (
    queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c
         FROM words w JOIN verses v ON v.id = w.verse_id
        WHERE w.strongs = ? AND v.book_id = ?`,
      [strongsId, bookId],
    )?.c ?? 0
  );
}

/** Which books a root appears in, for the distribution summary. */
export function getOccurrenceSpread(strongsId: string): Array<{ book_id: number; c: number }> {
  return queryAll<{ book_id: number; c: number }>(
    `SELECT v.book_id, COUNT(*) AS c
       FROM words w JOIN verses v ON v.id = w.verse_id
      WHERE w.strongs = ?
      GROUP BY v.book_id
      ORDER BY v.book_id`,
    [strongsId],
  );
}

export interface SearchHit {
  id: number;
  ref: string;
  text: string;
  book_id: number;
  chapter: number;
  verse: number;
  snippet: string;
}

/**
 * Very common words carry almost no signal, and including them in the loose
 * fallback would drown out the words that actually identify a verse.
 */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "had", "has", "have",
  "he", "her", "him", "his", "i", "in", "is", "it", "its", "me", "my", "not", "of", "on", "or",
  "our", "shall", "she", "so", "than", "that", "the", "their", "them", "then", "there", "they",
  "this", "to", "unto", "up", "was", "we", "were", "what", "when", "which", "who", "will",
  "with", "you", "your",
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export type SearchMode = "exact" | "loose";

export interface SearchResult {
  hits: SearchHit[];
  mode: SearchMode;
}

function runSearch(match: string, limit: number): SearchHit[] {
  return queryAll<SearchHit>(
    `SELECT v.id, v.ref, v.text, v.book_id, v.chapter, v.verse,
            snippet(verses_fts, 1, '<mark>', '</mark>', '…', 24) AS snippet
       FROM verses_fts
       JOIN verses v ON v.id = verses_fts.rowid
      WHERE verses_fts MATCH ?
      ORDER BY bm25(verses_fts, 10.0, 1.0)
      LIMIT ?`,
    [match, limit],
  );
}

/**
 * Text pasted from another translation will rarely match this one word for
 * word, so an exact search that comes up empty falls back to ranking verses by
 * how many of the distinctive words they share.
 */
export function searchVerses(query: string, limit = 25): SearchResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { hits: [], mode: "exact" };

  const exact = runSearch(tokens.map((token) => `"${token}"`).join(" "), limit);
  if (exact.length > 0) return { hits: exact, mode: "exact" };

  const meaningful = tokens.filter((token) => !STOPWORDS.has(token));
  const loose = (meaningful.length > 0 ? meaningful : tokens).map((token) => `"${token}"`);
  if (loose.length === 0) return { hits: [], mode: "exact" };

  return { hits: runSearch(loose.join(" OR "), limit), mode: "loose" };
}

export function getChapterVerses(bookId: number, chapter: number): Verse[] {
  return queryAll<Verse>(
    "SELECT * FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse",
    [bookId, chapter],
  );
}

export function getChapterCount(bookId: number): number {
  return (
    queryOne<{ c: number }>("SELECT chapters AS c FROM books WHERE id = ?", [bookId])?.c ?? 0
  );
}

export interface Neighbour {
  book: BookMeta;
  chapter: number;
  verse: number;
  ref: string;
}

function toNeighbour(verse: Verse | null): Neighbour | null {
  if (!verse) return null;
  const book = BOOKS_BY_ID.get(verse.book_id);
  if (!book) return null;
  return { book, chapter: verse.chapter, verse: verse.verse, ref: verse.ref };
}

/**
 * Steps to the adjacent verse by canonical id. Ids are contiguous apart from
 * the sixteen verses absent from the critical text, so a small scan skips them.
 */
export function getNeighbours(verseId: number): { prev: Neighbour | null; next: Neighbour | null } {
  const prev = queryOne<Verse>("SELECT * FROM verses WHERE id < ? ORDER BY id DESC LIMIT 1", [
    verseId,
  ]);
  const next = queryOne<Verse>("SELECT * FROM verses WHERE id > ? ORDER BY id ASC LIMIT 1", [
    verseId,
  ]);
  return { prev: toNeighbour(prev), next: toNeighbour(next) };
}

/** Verses present in the canonical numbering but absent from the source text. */
export function isOmittedVerse(bookId: number, chapter: number, verse: number): boolean {
  const before = queryOne<{ id: number }>(
    `SELECT id FROM verses
      WHERE book_id = ? AND chapter = ? AND verse < ?
      ORDER BY verse DESC LIMIT 1`,
    [bookId, chapter, verse],
  );
  const after = queryOne<{ id: number }>(
    `SELECT id FROM verses
      WHERE book_id = ? AND chapter = ? AND verse > ?
      ORDER BY verse ASC LIMIT 1`,
    [bookId, chapter, verse],
  );
  return Boolean(before && after);
}

export function getTranslationName(): string {
  return (
    queryOne<{ value: string }>("SELECT value FROM meta WHERE key = 'translation'")?.value ??
    "Berean Study Bible"
  );
}
