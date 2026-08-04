import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DeepLexicon } from "@/components/DeepLexicon";
import { NotesPanel } from "@/components/NotesPanel";
import { ResourceLinks } from "@/components/ResourceLinks";
import { SaveTermButton } from "@/components/SaveTermButton";
import { BOOKS_BY_ID } from "@/lib/books";
import {
  countOccurrences,
  getDeepLexiconEntries,
  getOccurrences,
  getOccurrenceSpread,
  getStrongs,
} from "@/lib/corpus";
import { getTerm, notesForStrongs, readCustomResources } from "@/lib/library";
import { hrefForBookId } from "@/lib/refs";
import { describeMorph, isEnglishPlaceholder } from "@/lib/render";
import { applyCustomTermResources, termResources } from "@/lib/resources";

interface Props {
  params: Promise<{ strongs: string }>;
  searchParams: Promise<{ show?: string }>;
}

const PAGE_SIZE = 40;

// Saved state and notes for the term are read from disk per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { strongs } = await params;
  const entry = getStrongs(strongs.toUpperCase());
  if (!entry) return { title: "BibleRoot" };
  return { title: `${entry.lemma ?? strongs} (${entry.id}) — BibleRoot` };
}

export default async function TermPage({ params, searchParams }: Props) {
  const { strongs: raw } = await params;
  const { show } = await searchParams;
  const strongs = raw.toUpperCase();

  if (!/^[HG]\d+$/.test(strongs)) notFound();
  const entry = getStrongs(strongs);
  if (!entry) notFound();

  const limit = Math.min(Number(show) || PAGE_SIZE, 1000);
  const total = countOccurrences(strongs);
  const occurrences = getOccurrences(strongs, limit);
  const spread = getOccurrenceSpread(strongs);
  const deepEntries = getDeepLexiconEntries(strongs);
  const [saved, notes, custom] = await Promise.all([
    getTerm(strongs),
    notesForStrongs(strongs),
    readCustomResources(),
  ]);

  const termContext = {
    strongs: entry.id,
    number: entry.number,
    language: entry.language,
    lemma: entry.lemma,
    translit: entry.translit,
    twot: entry.twot,
  };
  const links = [
    ...termResources(termContext),
    ...applyCustomTermResources(custom.term, termContext),
  ];

  const isGreek = entry.language === "greek";
  const scriptClass = isGreek ? "font-greek text-greek" : "font-hebrew text-hebrew";
  const topBooks = [...spread].sort((a, b) => b.c - a.c).slice(0, 8);
  const maxCount = topBooks[0]?.c ?? 1;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p
            // w-fit keeps the right-to-left box hugging its text, so the lemma
            // still lines up with the details beneath it.
            className={`${scriptClass} w-fit text-5xl leading-tight`}
            lang={isGreek ? "el" : "he"}
            dir={isGreek ? "ltr" : "rtl"}
          >
            {entry.lemma ?? entry.id}
          </p>
          <p className="mt-2 font-serif text-lg italic text-ink-soft">
            {entry.translit}
            {entry.pronunciation && (
              <span className="ml-2 text-sm not-italic text-ink-faint">
                /{entry.pronunciation}/
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            <span className="font-mono">{entry.id}</span> ·{" "}
            {isGreek ? "Greek" : "Hebrew / Aramaic"} ·{" "}
            {total.toLocaleString()} occurrence{total === 1 ? "" : "s"}
          </p>
        </div>

        <SaveTermButton
          initiallySaved={saved !== null}
          term={{
            strongs: entry.id,
            lemma: entry.lemma,
            translit: entry.translit,
            gloss: entry.gloss,
            language: entry.language,
          }}
        />
      </header>

      {entry.gloss && (
        <p className="mt-8 font-serif text-2xl leading-snug text-ink">{entry.gloss}</p>
      )}

      <dl className="mt-6 space-y-4 border-t border-rule pt-6 text-sm">
        {entry.definition && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">
              Strong&apos;s definition
            </dt>
            <dd className="mt-1 leading-relaxed text-ink">{entry.definition}</dd>
          </div>
        )}
        {entry.derivation && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">Derivation</dt>
            <dd className="mt-1 leading-relaxed text-ink-soft">{entry.derivation}</dd>
          </div>
        )}
        {entry.morph && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">Part of speech</dt>
            <dd className="mt-1 text-ink-soft">{describeMorph(entry.morph)}</dd>
          </div>
        )}
        {entry.twot && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">
              Theological Wordbook of the OT
            </dt>
            <dd className="mt-1 text-ink-soft">TWOT {entry.twot}</dd>
          </div>
        )}
        {entry.kjv_usage && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">
              Rendered in the KJV as
            </dt>
            <dd className="mt-1 leading-relaxed text-ink-soft">{entry.kjv_usage}</dd>
          </div>
        )}
      </dl>

      <DeepLexicon entries={deepEntries} />

      <ResourceLinks
        links={links}
        heading="Take it further"
        blurb="The standard reference tools for this word, opened in a new tab."
      />

      {topBooks.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg">Where it appears</h2>
          <ul className="mt-3 space-y-1.5">
            {topBooks.map((row) => {
              const book = BOOKS_BY_ID.get(row.book_id);
              if (!book) return null;
              return (
                <li key={row.book_id} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate text-ink-soft">{book.name}</span>
                  <span
                    className="h-2 rounded-full bg-accent/60"
                    style={{ width: `${Math.max(4, (row.c / maxCount) * 60)}%` }}
                    aria-hidden
                  />
                  <span className="text-xs text-ink-faint">{row.c}</span>
                </li>
              );
            })}
          </ul>
          {spread.length > topBooks.length && (
            <p className="mt-2 text-xs text-ink-faint">
              and {spread.length - topBooks.length} more book
              {spread.length - topBooks.length === 1 ? "" : "s"}
            </p>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-lg">
          Every occurrence{" "}
          <span className="text-sm font-normal text-ink-faint">
            (showing {Math.min(limit, total).toLocaleString()} of {total.toLocaleString()})
          </span>
        </h2>
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {occurrences.map((occurrence, index) => (
            <li key={`${occurrence.ref}-${index}`} className="py-3">
              <Link
                href={hrefForBookId(occurrence.book_id, occurrence.chapter, occurrence.verse)}
                className="group block"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium text-accent group-hover:underline">
                    {occurrence.ref}
                  </span>
                  <span
                    className={`${isGreek ? "font-greek" : "font-hebrew"} shrink-0 text-base ${isGreek ? "text-greek" : "text-hebrew"}`}
                    dir={isGreek ? "ltr" : "rtl"}
                  >
                    {occurrence.original}
                  </span>
                </div>
                <p className="mt-1 font-serif text-[15px] leading-snug text-ink-soft">
                  {occurrence.text}
                </p>
                {!isEnglishPlaceholder(occurrence.english) && (
                  <p className="mt-1 text-xs text-ink-faint">
                    here rendered “{occurrence.english!.trim()}”
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
        {limit < total && (
          <Link
            href={`?show=${Math.min(limit + 200, total)}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Show more →
          </Link>
        )}
      </section>

      <section className="mt-12">
        <NotesPanel
          strongs={entry.id}
          notes={notes}
          heading={`Notes on ${entry.lemma ?? entry.id}`}
        />
      </section>
    </div>
  );
}
