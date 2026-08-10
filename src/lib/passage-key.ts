/**
 * How one saved passage is told from another.
 *
 * Kept apart from `library.ts` so it can be checked on its own: that file
 * reaches the filesystem and is resolved by Next, and this rule is the thing
 * that decides whether removing one saved selection takes another with it.
 */
export function orderedVerses(verses: number[]): number[] {
  return [...new Set(verses.filter((verse) => Number.isInteger(verse) && verse > 0))].sort(
    (a, b) => a - b,
  );
}

/**
 * Two selections from the same chapter differ only by which verses are in them,
 * so the chapter alone cannot tell them apart. The order they were picked in
 * carries no meaning, and a verse picked twice is still one verse.
 */
export function savedPassageKey(passage: {
  bookId: number;
  chapter: number;
  verses: number[];
}): string {
  return `${passage.bookId}:${passage.chapter}:${orderedVerses(passage.verses).join(",")}`;
}
