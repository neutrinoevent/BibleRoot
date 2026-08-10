import Link from "next/link";

import { NotesPanel } from "@/components/NotesPanel";
import {
  libraryRootForDisplay,
  listNotes,
  listPassages,
  listTerms,
  savedPassageKey,
  savedTermKey,
  versePlaces,
} from "@/lib/library";
import { anchorHref, anchorLabel, parseVerseAnchor } from "@/lib/verse-anchor";
import { VerseFilter } from "@/components/VerseFilter";
import { scriptOfLanguage } from "@/lib/render";
import { hrefForBookId, wordHref } from "@/lib/refs";
import { BOOKS_BY_ID } from "@/lib/books";

export const metadata = { title: "Library — BibleRoot" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ verse?: string }>;
}

export default async function LibraryPage({ searchParams }: Props) {
  const { verse: verseParam } = await searchParams;

  // A reference typed in by hand is honoured only when it names one verse, so
  // that "everywhere this appears" means something exact.
  const asked = parseVerseAnchor(verseParam);
  const focus = asked && asked.verses.length === 1 ? asked : null;
  const places = focus ? await versePlaces(focus.bookId, focus.chapter, focus.verses[0]) : [];
  const [terms, notes, passages] = await Promise.all([listTerms(), listNotes(), listPassages()]);
  const relativeDir = libraryRootForDisplay();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-serif text-3xl tracking-tight">Library</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {terms.length} saved word{terms.length === 1 ? "" : "s"} · {passages.length} saved
        passage{passages.length === 1 ? "" : "s"} · {notes.length} note
        {notes.length === 1 ? "" : "s"} · kept as plain text on your own computer, in{" "}
        <code className="text-ink-faint">{relativeDir}</code>
      </p>

      <VerseFilter value={verseParam ?? ""} unreadable={Boolean(verseParam) && !focus} />

      {focus && (
        <section className="mt-8 rounded-xl border border-accent bg-paper-raised p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-lg">
              Everywhere {anchorLabel(focus)} appears
            </h2>
            <Link href="/library" className="text-sm text-accent hover:underline">
              Clear
            </Link>
          </div>
          {places.length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">
              Nothing in your library takes in that verse yet.{" "}
              <Link href={anchorHref(focus)} className="text-accent hover:underline">
                Open {anchorLabel(focus)} →
              </Link>
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-faint">
                {places.length} {places.length === 1 ? "entry" : "entries"} take in this verse.
                Each keeps its own notes.
              </p>
              <ul className="mt-3 space-y-2">
                {places.map((place) => (
                  <li key={place.id}>
                    <Link
                      href={anchorHref(place.anchor)}
                      className="block rounded-lg border border-rule bg-paper-sunken px-4 py-3 transition-colors hover:border-rule-strong"
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-serif text-base text-ink">{place.ref}</span>
                        <span className="shrink-0 text-xs text-ink-faint">
                          {place.alone ? "on its own" : `${place.anchor.verses.length} verses together`}
                          {place.kind === "note" && " · written about, not saved"}
                        </span>
                      </span>
                      {place.noteTitles.length > 0 ? (
                        <span className="mt-1 block text-sm text-ink-soft">
                          {place.noteTitles.join(" · ")}
                        </span>
                      ) : (
                        <span className="mt-1 block text-sm text-ink-faint">No notes on it yet</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-lg">Saved words and forms</h2>
        {terms.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            Save a word from any of its pages and it will gather here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {terms.map((term) => {
              const script = scriptOfLanguage(term.language);
              return (
                <li key={savedTermKey(term)}>
                  <Link
                    href={wordHref(term.strongs, term.form)}
                    className="block h-full rounded-xl border border-rule bg-paper-raised p-4 transition-colors hover:border-rule-strong"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`${script === "hebrew" ? "font-hebrew text-hebrew" : "font-greek text-greek"} text-2xl`}
                        dir={script === "hebrew" ? "rtl" : "ltr"}
                      >
                        {term.form ?? term.lemma ?? term.strongs}
                      </span>
                      <span className="font-mono text-[10px] text-ink-faint">{term.strongs}</span>
                    </div>
                    {term.form && (
                      <p className="mt-0.5 text-xs text-ink-faint">
                        one form of{" "}
                        <span
                          className={script === "hebrew" ? "font-hebrew" : "font-greek"}
                          dir={script === "hebrew" ? "rtl" : "ltr"}
                        >
                          {term.lemma}
                        </span>
                        {term.parsing ? ` · ${term.parsing}` : ""}
                      </p>
                    )}
                    {term.translit && (
                      <p className="mt-1 font-serif text-sm italic text-ink-soft">
                        {term.translit}
                      </p>
                    )}
                    {term.gloss && <p className="mt-1 text-sm text-ink">{term.gloss}</p>}
                    {term.notes && (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-faint">
                        {term.notes}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-lg">Saved passages</h2>
        {passages.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            Save a verse, or a set of verses you are reading together, and it will wait here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {passages.map((passage) => {
              const book = BOOKS_BY_ID.get(passage.bookId);
              const href = book
                ? `/verse/${book.slug}/${passage.chapter}/${passage.verses.join(",")}`
                : hrefForBookId(passage.bookId, passage.chapter, passage.verses[0]);
              return (
                <li key={savedPassageKey(passage)}>
                  <Link
                    href={href}
                    className="block rounded-xl border border-rule bg-paper-raised p-4 transition-colors hover:border-rule-strong"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-base text-ink">{passage.ref}</span>
                      {passage.verses.length > 1 && (
                        <span className="shrink-0 text-xs text-ink-faint">
                          {passage.verses.length} verses together
                        </span>
                      )}
                    </div>
                    {passage.excerpt && (
                      <p className="mt-1 line-clamp-2 font-serif text-sm leading-snug text-ink-soft">
                        {passage.excerpt}
                      </p>
                    )}
                    {passage.body && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-faint">{passage.body}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <NotesPanel notes={notes} heading="All notes" />
      </section>
    </div>
  );
}
