import { BOOKS_BY_ID, findBook } from "./books.ts";

/**
 * Which verses a saved thing is about, as numbers rather than as a label.
 *
 * Notes have always been anchored by the heading of the page they were written
 * on — "John 3:16", or "John 3:16, 17, 18" for several read together. That is
 * exactly right for keeping one set of thoughts apart from another: a note on
 * John 3:16 alone is not a note on the three verses together, and neither
 * should be shown in place of the other.
 *
 * It is no use at all for the opposite question. Standing on John 3:16, nothing
 * in the string "John 3:16, 17, 18" is easy to compare against, so a reader had
 * no way to learn that the verse in front of them is discussed in a study they
 * saved last week. This turns the label back into numbers so that question can
 * be asked.
 */
export interface VerseAnchor {
  bookId: number;
  chapter: number;
  verses: number[];
}

/**
 * Reads a label of the form `John 3:16` or `1 Samuel 3:4, 8, 10`.
 *
 * Returns null for anything it cannot read with certainty. A reader may write
 * their own `ref` into a note by hand, and guessing at what they meant would be
 * worse than admitting the label is not understood.
 */
export function parseVerseAnchor(label: string | null | undefined): VerseAnchor | null {
  if (!label) return null;
  const match = /^\s*(.+?)\s+(\d+)\s*:\s*([\d,\s]+?)\s*$/.exec(label);
  if (!match) return null;

  const book = findBook(match[1]);
  if (!book) return null;

  const chapter = Number(match[2]);
  if (!Number.isInteger(chapter) || chapter < 1) return null;

  const verses = [
    ...new Set(
      match[3]
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((verse) => Number.isInteger(verse) && verse > 0),
    ),
  ].sort((a, b) => a - b);
  if (verses.length === 0) return null;

  return { bookId: book.id, chapter, verses };
}

/** Whether a saved thing takes in this particular verse. */
export function anchorIncludes(
  anchor: VerseAnchor | null,
  bookId: number,
  chapter: number,
  verse: number,
): boolean {
  if (!anchor) return false;
  return anchor.bookId === bookId && anchor.chapter === chapter && anchor.verses.includes(verse);
}

/** The page that shows exactly what a saved thing is about. */
export function anchorHref(anchor: VerseAnchor): string {
  const book = BOOKS_BY_ID.get(anchor.bookId);
  if (!book) return "/library";
  return `/verse/${book.slug}/${anchor.chapter}/${anchor.verses.join(",")}`;
}

/** How the anchor reads on screen, rebuilt so it is consistent everywhere. */
export function anchorLabel(anchor: VerseAnchor): string {
  const book = BOOKS_BY_ID.get(anchor.bookId);
  const name = book?.name ?? `Book ${anchor.bookId}`;
  return `${name} ${anchor.chapter}:${anchor.verses.join(", ")}`;
}
