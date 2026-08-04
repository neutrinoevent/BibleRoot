import { BOOKS_BY_ID, BOOKS_BY_SLUG, findBook, type BookMeta } from "./books";

export interface VerseRef {
  kind: "verse";
  book: BookMeta;
  chapter: number;
  verse: number;
}

export interface ChapterRef {
  kind: "chapter";
  book: BookMeta;
  chapter: number;
}

export interface TextQuery {
  kind: "text";
  query: string;
}

export type ParsedInput = VerseRef | ChapterRef | TextQuery;

/**
 * Matches a trailing reference such as "Proverbs 20:22", "1 Sam 3.4" or
 * "Psalm 23". Anchored at the start so that pasted prose containing incidental
 * numbers falls through to a text search instead.
 */
const REFERENCE = /^\s*((?:[123]|i{1,3}|first|second|third)?\s*[a-z][a-z.\s]*?)\s*(\d+)\s*(?:[:.v]\s*(\d+))?\s*(?:[-–—]\s*\d+\s*)?$/i;

export function parseInput(raw: string): ParsedInput | null {
  const input = raw.trim();
  if (!input) return null;

  const match = REFERENCE.exec(input);
  if (match) {
    const book = findBook(match[1]);
    if (book) {
      const chapter = Number(match[2]);
      const verse = match[3] ? Number(match[3]) : undefined;
      if (verse !== undefined) return { kind: "verse", book, chapter, verse };
      return { kind: "chapter", book, chapter };
    }
  }

  // A bare book name means chapter 1.
  const bareBook = findBook(input);
  if (bareBook) return { kind: "chapter", book: bareBook, chapter: 1 };

  return { kind: "text", query: input };
}

export function verseHref(book: BookMeta, chapter: number, verse: number | number[]): string {
  const list = Array.isArray(verse) ? verse : [verse];
  return `/verse/${book.slug}/${chapter}/${list.join(",")}`;
}

/**
 * The verse segment of a URL may name several verses in the same chapter, so
 * that a reader can study a scattered selection together: `/verse/john/1/1,7,10`.
 * Order and duplicates are normalised away.
 */
export function parseVerseList(param: string): number[] {
  const seen = new Set<number>();
  for (const part of decodeURIComponent(param).split(/[,+]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // A range such as 3-6 expands to each verse in it.
    const range = /^(\d+)\s*[-–]\s*(\d+)$/.exec(trimmed);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (to >= from && to - from <= 200) {
        for (let verse = from; verse <= to; verse += 1) seen.add(verse);
      }
      continue;
    }

    const single = Number(trimmed);
    if (Number.isInteger(single) && single > 0) seen.add(single);
  }
  return [...seen].sort((a, b) => a - b);
}

/** "1,7,10" → "John 1:1, 7, 10" for display and for anchoring notes. */
export function formatVerseList(book: BookMeta, chapter: number, verses: number[]): string {
  if (verses.length === 0) return `${book.name} ${chapter}`;
  if (verses.length === 1) return `${book.name} ${chapter}:${verses[0]}`;
  return `${book.name} ${chapter}:${verses.join(", ")}`;
}

export function chapterHref(book: BookMeta, chapter: number): string {
  return `/read/${book.slug}/${chapter}`;
}

export function hrefForBookId(bookId: number, chapter: number, verse: number): string {
  const book = BOOKS_BY_ID.get(bookId);
  return book ? verseHref(book, chapter, verse) : "/";
}

export function bookFromSlug(slug: string): BookMeta | undefined {
  return BOOKS_BY_SLUG.get(slug) ?? findBook(slug);
}

export function termHref(strongs: string): string {
  return `/term/${strongs}`;
}

/**
 * Words in the text link to the form actually standing there, which carries its
 * own grammar, occurrences and renderings, and leads up to the root from there.
 */
export function wordHref(strongs: string, original?: string | null): string {
  return original ? `/term/${strongs}/${encodeURIComponent(original)}` : `/term/${strongs}`;
}

export function formatRef(book: BookMeta, chapter: number, verse?: number): string {
  return verse === undefined ? `${book.name} ${chapter}` : `${book.name} ${chapter}:${verse}`;
}
