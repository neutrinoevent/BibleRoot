import Link from "next/link";

import { NotesPanel } from "@/components/NotesPanel";
import { libraryRootForDisplay, listNotes, listTerms, savedTermKey } from "@/lib/library";
import { scriptOfLanguage } from "@/lib/render";
import { wordHref } from "@/lib/refs";

export const metadata = { title: "Library — BibleRoot" };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const [terms, notes] = await Promise.all([listTerms(), listNotes()]);
  const relativeDir = libraryRootForDisplay();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-serif text-3xl tracking-tight">Library</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {terms.length} saved word{terms.length === 1 ? "" : "s"} · {notes.length} note
        {notes.length === 1 ? "" : "s"} · kept as plain text on your own computer, in{" "}
        <code className="text-ink-faint">{relativeDir}</code>
      </p>

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
        <NotesPanel notes={notes} heading="All notes" />
      </section>
    </div>
  );
}
