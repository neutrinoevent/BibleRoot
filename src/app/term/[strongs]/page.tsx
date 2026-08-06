import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DeepLexicon } from "@/components/DeepLexicon";
import { FilterChip } from "@/components/FilterChip";
import { FormExplorer } from "@/components/FormExplorer";
import { LexiconText, citedStrongs } from "@/components/LexiconText";
import { Septuagint } from "@/components/Septuagint";
import { NotesPanel } from "@/components/NotesPanel";
import { ResourceLinks } from "@/components/ResourceLinks";
import { SaveTermButton } from "@/components/SaveTermButton";
import { BOOKS_BY_ID } from "@/lib/books";
import {
  countOccurrences,
  describeForm,
  septuagintBehindGreek,
  septuagintRenderingsOf,
  existingStrongs,
  getDeepLexiconEntries,
  getInflectedForms,
  getOccurrences,
  getOccurrenceSpread,
  getStrongs,
} from "@/lib/corpus";
import { getTerm, notesForStrongs, readCustomResources } from "@/lib/library";
import { hrefForBookId, wordHref } from "@/lib/refs";
import { describeMorph, isEnglishPlaceholder } from "@/lib/render";
import { applyCustomTermResources, termResources } from "@/lib/resources";

interface Props {
  params: Promise<{ strongs: string }>;
  searchParams: Promise<{ show?: string; form?: string; book?: string | string[] }>;
}

const PAGE_SIZE = 40;

/** A repeated query parameter arrives as a string, a list, or not at all. */
function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Keeps the form a reader arrived by, and the books they have chosen.
 *
 * The path has to be written out. A bare `#occurrences` is a link to a place on
 * the page the reader is already on, so the browser keeps whatever is in the
 * address and simply scrolls — which left the one link meant to clear a filter
 * doing nothing at all.
 */
function occurrenceHref(
  strongs: string,
  state: { form?: string; books?: number[]; show?: number },
): string {
  const query = new URLSearchParams();
  if (state.form) query.set("form", state.form);
  for (const book of state.books ?? []) query.append("book", String(book));
  if (state.show) query.set("show", String(state.show));
  const search = query.toString();
  return `/term/${strongs}${search ? `?${search}` : ""}#occurrences`;
}

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
  const { show, form, book } = await searchParams;
  const strongs = raw.toUpperCase();

  if (!/^[HG]\d+$/.test(strongs)) notFound();
  const entry = getStrongs(strongs);
  if (!entry) notFound();

  const spread = getOccurrenceSpread(strongs);

  // Books to narrow to, each honoured only if the word actually occurs there, so
  // a stale or mistyped one is dropped rather than matched against nothing.
  const present = new Set(spread.map((row) => row.book_id));
  const chosenBooks = [...new Set(asArray(book).map(Number))].filter((id) => present.has(id));

  // Every occurrence means every one. The list grows a page at a time so the
  // commonest words stay usable, and it stops only when the reader has them all.
  const allTotal = countOccurrences(strongs);
  const total = chosenBooks.length > 0 ? countOccurrences(strongs, chosenBooks) : allTotal;
  const limit = Math.max(PAGE_SIZE, Math.min(Number(show) || PAGE_SIZE, total));
  const occurrences = getOccurrences(
    strongs,
    limit,
    0,
    chosenBooks.length > 0 ? chosenBooks : undefined,
  );
  const deepEntries = getDeepLexiconEntries(strongs);
  const forms = getInflectedForms(strongs);
  const septuagint =
    entry.language === "greek"
      ? septuagintBehindGreek(strongs)
      : septuagintRenderingsOf(strongs);
  const cited = existingStrongs(
    citedStrongs(entry.derivation, entry.definition, entry.kjv_usage),
  );
  const arrivedFrom = form ? describeForm(strongs, form) : null;
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
            <a href="#occurrences" className="text-accent hover:underline">
              {total.toLocaleString()} occurrence{total === 1 ? "" : "s"}
            </a>
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

      {arrivedFrom && arrivedFrom.original.toLowerCase() !== entry.lemma?.toLowerCase() && (
        <p className="mt-6 rounded-lg border border-rule bg-paper-sunken px-4 py-3 text-sm text-ink-soft">
          You were reading{" "}
          <Link
            href={wordHref(entry.id, arrivedFrom.original)}
            className={`${scriptClass} text-lg decoration-dotted underline-offset-4 hover:underline`}
            dir={isGreek ? "ltr" : "rtl"}
            lang={isGreek ? "el" : "he"}
            title="Back to this form"
          >
            {arrivedFrom.original}
          </Link>
          {arrivedFrom.parsing_long && (
            <span className="text-ink-faint"> ({arrivedFrom.parsing_long})</span>
          )}
          . It is one of the shapes this word takes, and dictionaries gather every shape under
          a single headword — which is why you have arrived at{" "}
          <span className={scriptClass} dir={isGreek ? "ltr" : "rtl"}>
            {entry.lemma}
          </span>
          .{" "}
          <Link
            href={wordHref(entry.id, arrivedFrom.original)}
            className="text-accent hover:underline"
          >
            Return to that form →
          </Link>
        </p>
      )}

      {entry.gloss && (
        <p className="mt-8 font-serif text-2xl leading-snug text-ink">{entry.gloss}</p>
      )}

      <dl className="mt-6 space-y-4 border-t border-rule pt-6 text-sm">
        {entry.definition && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">
              Strong&apos;s definition
            </dt>
            <dd className="mt-1 leading-relaxed text-ink"><LexiconText text={entry.definition} known={cited} /></dd>
          </div>
        )}
        {entry.derivation && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-faint">Derivation</dt>
            <dd className="mt-1 leading-relaxed text-ink-soft"><LexiconText text={entry.derivation} known={cited} /></dd>
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
            <dd className="mt-1 leading-relaxed text-ink-soft"><LexiconText text={entry.kjv_usage} known={cited} /></dd>
          </div>
        )}
      </dl>

      {forms.length > 1 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg">
            How it appears in the text{" "}
            <span className="text-sm font-normal text-ink-faint">
              ({forms.length} forms)
            </span>
          </h2>
          <p className="mt-1 text-sm text-ink-faint">
            A word changes shape according to its work in a sentence. These are the shapes it
            takes across Scripture — open any one for its grammar and the verses it stands in.
            All belong to{" "}
            <span className={scriptClass} dir={isGreek ? "ltr" : "rtl"}>
              {entry.lemma}
            </span>
            .
          </p>
          <FormExplorer
            strongs={entry.id}
            forms={forms}
            lemma={entry.lemma}
            language={entry.language}
            currentForm={arrivedFrom?.original ?? null}
          />
        </section>
      )}

      <DeepLexicon entries={deepEntries} />

      {isGreek && (
        <Septuagint matches={septuagint} lemma={entry.lemma} direction="behind-greek" />
      )}

      <ResourceLinks
        links={links}
        heading="Take it further"
        blurb="Other trusted resources, each opening at this exact word."
      />

      <section id="occurrences" className="mt-10 scroll-mt-20">
        <h2 className="font-serif text-lg">
          {chosenBooks.length > 0 ? "The occurrences you chose" : "Every occurrence"}{" "}
          <span className="text-sm font-normal text-ink-faint">
            (showing {Math.min(limit, total).toLocaleString()} of {total.toLocaleString()}
            {chosenBooks.length > 0
              ? ` in ${chosenBooks.map((id) => BOOKS_BY_ID.get(id)?.name).join(", ")}`
              : ""}
            )
          </span>
        </h2>
        {/* Never let a filter make verses disappear without saying so. */}
        {chosenBooks.length > 0 && allTotal > total && (
          <p className="mt-1 text-sm text-ink-faint">
            {(allTotal - total).toLocaleString()} further occurrence
            {allTotal - total === 1 ? " is" : "s are"} set aside by that choice.{" "}
            <Link
              href={occurrenceHref(strongs, { form })}
              className="text-accent hover:underline"
            >
              Show all {allTotal.toLocaleString()}
            </Link>
          </p>
        )}

        {spread.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link
              href={occurrenceHref(strongs, { form })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                chosenBooks.length > 0
                  ? "border-rule text-ink-soft hover:border-rule-strong"
                  : "border-accent text-accent"
              }`}
            >
              All {allTotal.toLocaleString()}
            </Link>
            {[...spread]
              .sort((a, b) => b.c - a.c)
              .map((row) => {
                const picked = chosenBooks.includes(row.book_id);
                const name = BOOKS_BY_ID.get(row.book_id)?.name;
                return (
                  <FilterChip
                    key={row.book_id}
                    selected={picked}
                    title={picked ? `Stop showing only ${name}` : `Show only ${name}`}
                    href={occurrenceHref(strongs, {
                      form,
                      books: picked ? [] : [row.book_id],
                    })}
                    toggleHref={occurrenceHref(strongs, {
                      form,
                      books: picked
                        ? chosenBooks.filter((id) => id !== row.book_id)
                        : [...chosenBooks, row.book_id],
                    })}
                  >
                    <span className="text-xs">{name}</span>
                    <span className="text-xs text-ink-faint">{row.c.toLocaleString()}</span>
                  </FilterChip>
                );
              })}
          </div>
        )}
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
            href={occurrenceHref(strongs, { form, books: chosenBooks, show: limit + PAGE_SIZE * 5 })}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Show {Math.min(PAGE_SIZE * 5, total - limit).toLocaleString()} more →
          </Link>
        )}
      </section>

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

      {!isGreek && (
        <Septuagint
          matches={septuagint}
          lemma={entry.lemma}
          direction="renderings-of-hebrew"
        />
      )}


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
