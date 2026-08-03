import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { InterlinearGrid } from "@/components/InterlinearGrid";
import { NotesPanel } from "@/components/NotesPanel";
import { ReadingLine } from "@/components/ReadingLine";
import {
  getAnnotatedWords,
  getNeighbours,
  getVerse,
  isOmittedVerse,
} from "@/lib/corpus";
import { notesForRef } from "@/lib/library";
import { bookFromSlug, chapterHref, verseHref } from "@/lib/refs";

interface Props {
  params: Promise<{ book: string; chapter: string; verse: string }>;
}

// Notes attached to the verse are read from disk per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug, chapter, verse } = await params;
  const book = bookFromSlug(slug);
  if (!book) return { title: "BibleRoot" };
  return { title: `${book.name} ${chapter}:${verse} — BibleRoot` };
}

export default async function VersePage({ params }: Props) {
  const { book: slug, chapter: chapterParam, verse: verseParam } = await params;
  const book = bookFromSlug(slug);
  const chapter = Number(chapterParam);
  const verseNumber = Number(verseParam);

  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verseNumber)) notFound();

  const verse = getVerse(book.id, chapter, verseNumber);

  if (!verse) {
    // The sixteen verses absent from the critical text still have canonical
    // numbers, so explain rather than 404.
    if (isOmittedVerse(book.id, chapter, verseNumber)) {
      return (
        <div className="mx-auto max-w-3xl px-5 py-16">
          <p className="text-sm text-ink-faint">
            <Link href={chapterHref(book, chapter)} className="hover:text-ink">
              {book.name} {chapter}
            </Link>
          </p>
          <h1 className="mt-2 font-serif text-3xl">
            {book.name} {chapter}:{verseNumber}
          </h1>
          <p className="mt-4 max-w-prose text-ink-soft">
            This verse number is not present in the manuscripts underlying the Berean Study Bible.
            It is one of a handful of verses that appear in later manuscripts and are carried as
            footnotes in most modern translations.
          </p>
          <Link
            href={chapterHref(book, chapter)}
            className="mt-6 inline-block text-sm text-accent hover:underline"
          >
            Read {book.name} {chapter} →
          </Link>
        </div>
      );
    }
    notFound();
  }

  const words = getAnnotatedWords(verse.id);
  const { prev, next } = getNeighbours(verse.id);
  const notes = await notesForRef(verse.ref);
  const poetry = words.some((word) => word.para?.startsWith("indent"));
  const language = words.find((word) => word.language)?.language ?? null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <nav className="flex items-center justify-between text-sm">
        <Link href={chapterHref(book, chapter)} className="text-ink-faint hover:text-ink">
          {book.name} {chapter}
        </Link>
        <span className="text-xs uppercase tracking-wide text-ink-faint">
          {language === "Greek" ? "Greek" : language === "Aramaic" ? "Aramaic" : "Hebrew"}
        </span>
      </nav>

      {verse.heading && (
        <p className="mt-6 font-serif text-sm uppercase tracking-[0.12em] text-ink-faint">
          {verse.heading}
        </p>
      )}

      <h1 className="mt-2 font-serif text-2xl tracking-tight">{verse.ref}</h1>

      <section className="mt-6 rounded-xl border border-rule bg-paper-raised p-6 sm:p-8">
        <ReadingLine words={words} poetry={poetry} />
        <p className="mt-6 border-t border-rule pt-3 text-xs text-ink-faint">
          Hover any word for the original behind it · click to keep it open · Berean Study Bible
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg">Interlinear</h2>
        <p className="mt-1 text-sm text-ink-faint">
          In the order of the original text. Select a word to open its root.
        </p>
        <div className="mt-3 rounded-xl border border-rule bg-paper-raised p-4">
          <InterlinearGrid words={words} />
        </div>
      </section>

      {verse.crossref && (
        <section className="mt-8">
          <h2 className="font-serif text-lg">Cross references</h2>
          <p className="mt-1 text-sm text-ink-soft">{verse.crossref}</p>
        </section>
      )}

      <section className="mt-10">
        <NotesPanel verseRef={verse.ref} notes={notes} />
      </section>

      <nav className="mt-12 flex items-center justify-between border-t border-rule pt-5 text-sm">
        {prev ? (
          <Link
            href={verseHref(prev.book, prev.chapter, prev.verse)}
            className="text-ink-soft hover:text-ink"
          >
            ← {prev.ref}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={verseHref(next.book, next.chapter, next.verse)}
            className="text-ink-soft hover:text-ink"
          >
            {next.ref} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
