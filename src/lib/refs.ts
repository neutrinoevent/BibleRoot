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

export function verseHref(book: BookMeta, chapter: number, verse: number): string {
  return `/verse/${book.slug}/${chapter}/${verse}`;
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

export function formatRef(book: BookMeta, chapter: number, verse?: number): string {
  return verse === undefined ? `${book.name} ${chapter}` : `${book.name} ${chapter}:${verse}`;
}
