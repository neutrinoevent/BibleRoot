import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { NotesPanel } from "@/components/NotesPanel";
import { ResourceLinks } from "@/components/ResourceLinks";
import { SaveTermButton } from "@/components/SaveTermButton";
import { BOOKS_BY_ID } from "@/lib/books";
import {
  countFormOccurrences,
  getForm,
  getFormOccurrences,
  getFormSpread,
  getInflectedForms,
  getRenderings,
  getStrongs,
} from "@/lib/corpus";
import { getTerm, notesForStrongs, readCustomResources } from "@/lib/library";
import { hrefForBookId } from "@/lib/refs";
import { decomposeParsing, explainParsing } from "@/lib/morphology";
import { isEnglishPlaceholder } from "@/lib/render";
import { applyCustomTermResources, termResources } from "@/lib/resources";

interface Props {
  params: Promise<{ strongs: string; form: string }>;
  searchParams: Promise<{ show?: string }>;
}

const PAGE_SIZE = 40;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { strongs, form } = await params;
  const decoded = decodeURIComponent(form);
  return { title: `${decoded} (${strongs.toUpperCase()}) — BibleRoot` };
}

/**
 * The word as it actually stands in the text, rather than the dictionary form
 * it is filed under. This is what a reader is looking at, so it gets a page of
 * its own: its grammar explained, its own occurrences, its own renderings, and
 * a clear way up to the root.
 */
export default async function FormPage({ params, searchParams }: Props) {
  const { strongs: rawStrongs, form: rawForm } = await params;
  const { show } = await searchParams;

  const strongs = rawStrongs.toUpperCase();
  const original = decodeURIComponent(rawForm);
  if (!/^[HG]\d+$/.test(strongs)) notFound();

  const entry = getStrongs(strongs);
  const form = getForm(strongs, original);
  if (!entry || !form) notFound();

  const limit = Math.min(Number(show) || PAGE_SIZE, 1000);
  const total = countFormOccurrences(strongs, form.original);
  const occurrences = getFormOccurrences(strongs, form.original, limit);
  const renderings = getRenderings(strongs, form.original);
  const siblings = getInflectedForms(strongs).filter(
    (item) => item.original.toLowerCase() !== form.original.toLowerCase(),
  );
  const grammar = explainParsing(form.parsing_long, entry.language);
  const parts = decomposeParsing(form.parsing_long);
  const spread = getFormSpread(strongs, form.original);
  const topBooks = spread.slice(0, 8);
  const maxCount = topBooks[0]?.c ?? 1;

  const [saved, notes, custom] = await Promise.all([
    getTerm(strongs),
    notesForStrongs(strongs),
    readCustomResources(),
  ]);

  const isGreek = entry.language === "greek";
  const scriptClass = isGreek ? "font-greek text-greek" : "font-hebrew text-hebrew";
  const dir = isGreek ? "ltr" : "rtl";

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

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">As it stands in the text</p>
          <p
            className={`${scriptClass} mt-2 w-fit text-5xl leading-tight`}
            lang={isGreek ? "el" : "he"}
            dir={dir}
          >
            {form.original}
          </p>
          {form.translit && (
            <p className="mt-2 font-serif text-lg italic text-ink-soft">{form.translit}</p>
          )}
          <p className="mt-1 text-sm text-ink-soft">{form.parsing_long}</p>
          <p className="mt-1 text-sm text-ink-faint">
            {total.toLocaleString()} occurrence{total === 1 ? "" : "s"} of this exact form
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

      {/* The path up to the root, stated plainly and kept near the top. */}
      <Link
        href={`/term/${entry.id}?form=${encodeURIComponent(form.original)}`}
        className="mt-6 block rounded-xl border border-rule bg-paper-raised px-5 py-4 transition-colors hover:border-rule-strong"
      >
        <span className="text-xs uppercase tracking-wide text-ink-faint">Root</span>
        <span className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className={`${scriptClass} text-2xl`} dir={dir}>
            {entry.lemma ?? entry.id}
          </span>
          <span className="font-serif italic text-ink-soft">{entry.translit}</span>
          <span className="font-mono text-xs text-ink-faint">{entry.id}</span>
          <span className="ml-auto text-sm text-accent">
            Lexicons, concordance and every form →
          </span>
        </span>
        {entry.gloss && <span className="mt-2 block text-sm text-ink">{entry.gloss}</span>}
        {entry.definition && (
          <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
            {entry.definition}
          </span>
        )}
      </Link>

      {parts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg">What this word is built from</h2>
          <p className="mt-1 text-sm text-ink-faint">
            Written as one word, carrying several. Hebrew attaches its short prepositions, its
            article and its pronouns rather than spacing them out.
          </p>
          <ol className="mt-3 space-y-2">
            {parts.map((part, index) => (
              <li
                key={`${part.role}-${index}`}
                className="flex gap-3 rounded-lg border border-rule bg-paper-raised p-4"
              >
                <span className="w-14 shrink-0 text-xs uppercase tracking-wide text-ink-faint">
                  {part.role}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-2">
                    {part.form && (
                      <span className={`${scriptClass} text-xl`} dir={dir}>
                        {part.form}
                      </span>
                    )}
                    <span className="font-medium text-ink">{part.label}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                    {part.meaning}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {grammar.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg">What this form is doing</h2>
          <dl className="mt-3 space-y-3">
            {grammar.map((note) => (
              <div key={note.term} className="rounded-lg border border-rule bg-paper-raised p-4">
                <dt className="font-medium text-ink">{note.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{note.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {renderings.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg">
            Rendered in English as{" "}
            <span className="text-sm font-normal text-ink-faint">
              ({renderings.length}
              {renderings.length === 30 ? "+" : ""} way{renderings.length === 1 ? "" : "s"})
            </span>
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {renderings.map((rendering) => (
              <li
                key={rendering.english}
                className="rounded-full border border-rule bg-paper-raised px-3 py-1 text-sm text-ink"
              >
                {rendering.english}
                <span className="ml-2 text-xs text-ink-faint">{rendering.c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {siblings.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg">Other forms of this root</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {siblings.slice(0, 40).map((item) => (
              <li key={item.original}>
                <Link
                  href={`/term/${entry.id}/${encodeURIComponent(item.original)}`}
                  title={item.parsing_long ?? undefined}
                  className="block rounded-lg border border-rule bg-paper-raised px-3 py-2 text-center transition-colors hover:border-rule-strong"
                >
                  <span className={`${scriptClass} block text-lg`} dir={dir}>
                    {item.original}
                  </span>
                  <span className="block font-mono text-[10px] text-ink-faint">
                    {item.parsing ?? ""} · {item.c.toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {siblings.length > 40 && (
            <p className="mt-2 text-xs text-ink-faint">and {siblings.length - 40} more</p>
          )}
        </section>
      )}

      {topBooks.length > 1 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg">Where this form appears</h2>
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

      <ResourceLinks
        links={links}
        heading="Take it further"
        blurb="Reference tools for this word. They are organised by root, so they open at the dictionary form."
      />

      <section className="mt-10">
        <h2 className="font-serif text-lg">
          Every occurrence of this form{" "}
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
                  {!isEnglishPlaceholder(occurrence.english) && (
                    <span className="shrink-0 text-xs text-ink-faint">
                      “{occurrence.english!.trim()}”
                    </span>
                  )}
                </div>
                <p className="mt-1 font-serif text-[15px] leading-snug text-ink-soft">
                  {occurrence.text}
                </p>
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
