import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getChapterCount, getChapterVerses } from "@/lib/corpus";
import { bookFromSlug, chapterHref, verseHref } from "@/lib/refs";

interface Props {
  params: Promise<{ book: string; chapter: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug, chapter } = await params;
  const book = bookFromSlug(slug);
  return { title: book ? `${book.name} ${chapter} — BibleRoot` : "BibleRoot" };
}

/** Chapter view: the reading context around a verse. Each verse links inward. */
export default async function ChapterPage({ params }: Props) {
  const { book: slug, chapter: chapterParam } = await params;
  const book = bookFromSlug(slug);
  const chapter = Number(chapterParam);
  if (!book || !Number.isInteger(chapter) || chapter < 1) notFound();

  const verses = getChapterVerses(book.id, chapter);
  if (verses.length === 0) notFound();

  const chapterCount = getChapterCount(book.id);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-serif text-3xl tracking-tight">
        {book.name} {chapter}
      </h1>

      <div className="mt-8 space-y-1">
        {verses.map((verse) => (
          <div key={verse.id}>
            {verse.heading && (
              <h2 className="mb-2 mt-8 font-serif text-sm uppercase tracking-[0.12em] text-ink-faint">
                {verse.heading}
              </h2>
            )}
            <Link
              href={verseHref(book, chapter, verse.verse)}
              className="group flex gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-paper-sunken"
            >
              <span className="mt-1.5 w-7 shrink-0 text-right font-mono text-xs text-ink-faint">
                {verse.verse}
              </span>
              <span className="font-serif text-[1.15rem] leading-relaxed text-ink">
                {verse.text}
              </span>
            </Link>
          </div>
        ))}
      </div>

      <nav className="mt-12 flex items-center justify-between border-t border-rule pt-5 text-sm">
        {chapter > 1 ? (
          <Link href={chapterHref(book, chapter - 1)} className="text-ink-soft hover:text-ink">
            ← {book.name} {chapter - 1}
          </Link>
        ) : (
          <span />
        )}
        {chapter < chapterCount ? (
          <Link href={chapterHref(book, chapter + 1)} className="text-ink-soft hover:text-ink">
            {book.name} {chapter + 1} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
