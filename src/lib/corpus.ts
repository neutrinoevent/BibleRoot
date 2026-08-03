import "server-only";

import { BOOKS_BY_ID, type BookMeta } from "./books";
import { queryAll, queryOne } from "./db";
import type { AnnotatedWord } from "./render";

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
  occurrences: number;
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
            w.parsing_long, w.strongs, w.english, w.prefix, w.suffix, w.para,
            s.lemma, s.gloss, s.definition, s.translit AS lemma_translit,
            s.occurrences
       FROM words w
       LEFT JOIN strongs s ON s.id = w.strongs
      WHERE w.verse_id = ?
      ORDER BY w.pos`,
    [verseId],
  );
}

export function getStrongs(id: string): StrongsEntry | null {
  return queryOne<StrongsEntry>("SELECT * FROM strongs WHERE id = ?", [id]);
}

/** Every other place the same lexical root is used — the concordance view. */
export function getOccurrences(strongsId: string, limit: number, offset = 0): Occurrence[] {
  return queryAll<Occurrence>(
    `SELECT v.ref, v.book_id, v.chapter, v.verse, v.text,
            w.english, w.original, w.translit, w.parsing
       FROM words w
       JOIN verses v ON v.id = w.verse_id
      WHERE w.strongs = ?
      ORDER BY v.id, w.pos
      LIMIT ? OFFSET ?`,
    [strongsId, limit, offset],
  );
}

export function countOccurrences(strongsId: string): number {
  return (
    queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM words WHERE strongs = ?", [strongsId])
      ?.c ?? 0
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
