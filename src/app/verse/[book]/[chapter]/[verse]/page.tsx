import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { InterlinearGrid } from "@/components/InterlinearGrid";
import { NotesPanel } from "@/components/NotesPanel";
import { PassageSaver } from "@/components/PassageSaver";
import { SavePassageButton } from "@/components/SavePassageButton";
import { VersePlaces } from "@/components/VersePlaces";
import { ReadingLine } from "@/components/ReadingLine";
import { ResourceLinks } from "@/components/ResourceLinks";
import { SharedRoots } from "@/components/SharedRoots";
import { TermHighlightProvider } from "@/components/TermHighlight";
import {
  getAnnotatedWords,
  getNeighbours,
  getSharedRoots,
  getVerse,
  isOmittedVerse,
  type AnnotatedWord,
  type Verse,
} from "@/lib/corpus";
import {
  getPassage,
  notesForRef,
  readCustomResources,
  savedPassageKeysIn,
  versePlaces,
} from "@/lib/library";
import {
  bookFromSlug,
  chapterHref,
  formatVerseList,
  parseVerseList,
  verseHref,
} from "@/lib/refs";
import { applyCustomVerseResources, verseResources } from "@/lib/resources";

interface Props {
  params: Promise<{ book: string; chapter: string; verse: string }>;
}

// Notes attached to the verse are read from disk per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug, chapter, verse } = await params;
  const book = bookFromSlug(slug);
  if (!book) return { title: "BibleRoot" };
  const verses = parseVerseList(verse);
  return { title: `${formatVerseList(book, Number(chapter), verses)} — BibleRoot` };
}

/** One verse: heading, reading line, interlinear. Reused across a selection. */
function VerseBlock({
  verse,
  words,
  showRef,
}: {
  verse: Verse;
  words: AnnotatedWord[];
  showRef: boolean;
}) {
  const poetry = words.some((word) => word.para?.startsWith("indent"));

  return (
    <section className="mt-6 rounded-xl border border-rule bg-paper-raised p-6 sm:p-8">
      {verse.heading && (
        <p className="mb-3 font-serif text-sm uppercase tracking-[0.12em] text-ink-faint">
          {verse.heading}
        </p>
      )}
      {showRef && (
        <p className="mb-3 font-mono text-xs text-ink-faint">{verse.ref}</p>
      )}

      {verse.disputed && (
        <p className="mb-4 rounded-lg border border-rule-strong bg-paper-sunken px-4 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Disputed text.</span> {verse.disputed} Most modern
          translations print it in a footnote; the King James and other translations from the
          Traditional Text carry it in the running text. The Greek below is that of the manuscripts
          which have it.
        </p>
      )}

      <ReadingLine words={words} text={verse.text} poetry={poetry} />

      {verse.footnote && (
        <p className="mt-5 border-t border-rule pt-3 text-sm leading-relaxed text-ink-faint">
          <span className="uppercase tracking-wide">Footnote</span>{" "}
          {verse.footnote.replace(/⟨\s*(\d+)\s*⟩/g, " $1 ").replace(/\s+/g, " ").trim()}
        </p>
      )}

      <details className="mt-6 border-t border-rule pt-3">
        <summary className="cursor-pointer list-none text-xs text-ink-faint hover:text-ink">
          Interlinear ›
        </summary>
        <div className="mt-3">
          <InterlinearGrid words={words} />
        </div>
      </details>
    </section>
  );
}

export default async function VersePage({ params }: Props) {
  const { book: slug, chapter: chapterParam, verse: verseParam } = await params;
  const book = bookFromSlug(slug);
  const chapter = Number(chapterParam);
  const requested = parseVerseList(verseParam);

  if (!book || !Number.isInteger(chapter) || requested.length === 0) notFound();

  const found = requested
    .map((number) => ({ number, verse: getVerse(book.id, chapter, number) }))
    .filter((entry): entry is { number: number; verse: Verse } => entry.verse !== null);

  if (found.length === 0) {
    const single = requested[0];
    // The sixteen verses absent from the critical text still have canonical
    // numbers, so explain rather than 404.
    if (requested.length === 1 && isOmittedVerse(book.id, chapter, single)) {
      return (
        <div className="mx-auto max-w-3xl px-5 py-16">
          <p className="text-sm text-ink-faint">
            <Link href={chapterHref(book, chapter)} className="hover:text-ink">
              {book.name} {chapter}
            </Link>
          </p>
          <h1 className="mt-2 font-serif text-3xl">
            {book.name} {chapter}:{single}
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

  const multiple = found.length > 1;
  const numbers = found.map((entry) => entry.number);
  const label = formatVerseList(book, chapter, numbers);
  const noteRef = label;
  const missing = requested.filter((number) => !numbers.includes(number));

  const [notes, custom, savedPassage, savedKeys, places] = await Promise.all([
    notesForRef(noteRef),
    readCustomResources(),
    getPassage(book.id, chapter, numbers),
    savedPassageKeysIn(book.id, chapter),
    // Only asked for a single verse: on a selection, "elsewhere" would mean a
    // different thing for each verse on the page and say nothing clearly.
    multiple ? Promise.resolve([]) : versePlaces(book.id, chapter, numbers[0]),
  ]);

  // Resource links address a single verse, so a selection uses its first.
  const verseContext = {
    book,
    chapter,
    verse: numbers[0],
    ref: found[0].verse.ref,
  };
  const links = [
    ...verseResources(verseContext),
    ...applyCustomVerseResources(custom.verse, verseContext),
  ];

  const sharedRoots = multiple ? getSharedRoots(found.map((entry) => entry.verse.id)) : [];
  const { prev, next } = getNeighbours(found[0].verse.id);
  const language = found
    .flatMap((entry) => getAnnotatedWords(entry.verse.id))
    .find((word) => word.language)?.language;

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

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-2xl tracking-tight">{label}</h1>
        {!multiple && (
          <SavePassageButton
            initiallySaved={savedPassage !== null}
            passage={{
              ref: label,
              bookId: book.id,
              chapter,
              verses: numbers,
              excerpt: found[0].verse.text,
            }}
          />
        )}
      </div>
      {multiple && (
        <p className="mt-1 text-sm text-ink-faint">
          {found.length} verses, side by side. A note written here belongs to all of them.
        </p>
      )}
      {multiple && (
        <PassageSaver
          bookId={book.id}
          chapter={chapter}
          savedKeys={savedKeys}
          verses={found.map((entry) => ({
            number: entry.number,
            ref: `${book.name} ${chapter}:${entry.number}`,
            text: entry.verse.text,
          }))}
        />
      )}
      {missing.length > 0 && (
        <p className="mt-2 text-sm text-ink-faint">
          Verse{missing.length === 1 ? "" : "s"} {missing.join(", ")} could not be shown; absent
          from this text.
        </p>
      )}

      <TermHighlightProvider>
        {found.map((entry) => (
          <VerseBlock
            key={entry.verse.id}
            verse={entry.verse}
            words={getAnnotatedWords(entry.verse.id)}
            showRef={multiple}
          />
        ))}

        <p className="mt-3 text-xs text-ink-faint">
          Hover any word for the original behind it · click to keep it open · Berean Study Bible
        </p>

        <SharedRoots roots={sharedRoots} verseCount={found.length} />
      </TermHighlightProvider>

      {!multiple && (
        <p className="mt-6 text-sm">
          <Link
            href={`${chapterHref(book, chapter)}?select=${numbers[0]}`}
            className="text-accent hover:underline"
          >
            Compare with other verses in {book.name} {chapter} →
          </Link>
        </p>
      )}

      {!multiple && found[0].verse.crossref && (
        <section className="mt-8">
          <h2 className="font-serif text-lg">Cross references</h2>
          <p className="mt-1 text-sm text-ink-soft">{found[0].verse.crossref}</p>
        </section>
      )}

      <ResourceLinks
        links={links}
        heading={multiple ? `Study ${found[0].verse.ref} elsewhere` : "Study this verse elsewhere"}
        blurb="Commentaries, translators' notes and other versions of this verse."
      />

      {!multiple && (
        <VersePlaces
          places={places}
          current={`${book.id}:${chapter}:${numbers[0]}`}
          verseLabel={label}
        />
      )}

      <section className="mt-10">
        <NotesPanel verseRef={noteRef} notes={notes} />
      </section>

      {!multiple && (
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
      )}
    </div>
  );
}
