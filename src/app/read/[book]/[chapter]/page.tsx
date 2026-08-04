import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ChapterVerses } from "@/components/ChapterVerses";
import { getChapterCount, getChapterVerses } from "@/lib/corpus";
import { bookFromSlug, chapterHref, parseVerseList } from "@/lib/refs";

interface Props {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ select?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug, chapter } = await params;
  const book = bookFromSlug(slug);
  return { title: book ? `${book.name} ${chapter} — BibleRoot` : "BibleRoot" };
}

/** Chapter view: the reading context around a verse. Each verse links inward. */
export default async function ChapterPage({ params, searchParams }: Props) {
  const { book: slug, chapter: chapterParam } = await params;
  const { select } = await searchParams;
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

      <ChapterVerses
        verses={verses.map((verse) => ({
          id: verse.id,
          verse: verse.verse,
          text: verse.text,
          heading: verse.heading,
        }))}
        bookSlug={book.slug}
        bookName={book.name}
        chapter={chapter}
        initialSelection={select ? parseVerseList(select) : []}
      />

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
