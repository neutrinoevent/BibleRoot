import Link from "next/link";

import { SearchBox } from "@/components/SearchBox";
import { BOOKS_BY_ID } from "@/lib/books";
import { corpusExists } from "@/lib/db";
import {
  libraryCounts,
  listNotes,
  listPassages,
  listTerms,
  savedPassageKey,
  savedTermKey,
} from "@/lib/library";
import { wordHref } from "@/lib/refs";
import { scriptOfLanguage } from "@/lib/render";

const EXAMPLES = [
  { label: "Proverbs 20:22", href: "/verse/proverbs/20/22" },
  { label: "Genesis 1:1", href: "/verse/genesis/1/1" },
  { label: "Psalm 23:1", href: "/verse/psalms/23/1" },
  { label: "John 1:1", href: "/verse/john/1/1" },
  { label: "Romans 12:2", href: "/verse/romans/12/2" },
];

// The library is read from disk on every request, so this page must not be
// baked at build time.
export const dynamic = "force-dynamic";

function CorpusMissing() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="font-serif text-3xl">One more step</h1>
      <p className="mt-4 text-ink-soft">
        The interlinear corpus has not been built yet. It is downloaded from public sources and
        compiled into a local database, which takes a few minutes and about 85 MB of disk.
      </p>
      <pre className="mt-6 overflow-x-auto rounded-lg border border-rule bg-paper-sunken p-4 text-sm">
        npm run build:data
      </pre>
      <p className="mt-4 text-sm text-ink-faint">Then reload this page.</p>
    </div>
  );
}

export default async function HomePage() {
  if (!corpusExists()) return <CorpusMissing />;

  const [counts, terms, notes, passages] = await Promise.all([
    libraryCounts(),
    listTerms(),
    listNotes(),
    listPassages(),
  ]);
  const recentTerms = terms.slice(0, 6);
  const recentPassages = passages.slice(0, 5);
  const recentNotes = notes.slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
        Read a verse down to its <span className="text-hebrew">roots</span>.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        Open any verse, hover a word, and see the Hebrew, Aramaic or Greek behind it — then follow
        the root through the whole of Scripture and keep your own notes.
      </p>

      <div className="mt-8">
        <SearchBox autoFocus />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-faint">Try</span>
        {EXAMPLES.map((example) => (
          <Link
            key={example.href}
            href={example.href}
            className="rounded-full border border-rule px-3 py-1 text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
          >
            {example.label}
          </Link>
        ))}
      </div>

      {(counts.terms > 0 || counts.notes > 0 || counts.passages > 0) && (
        <section className="mt-16 border-t border-rule pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Your library</h2>
            <Link href="/library" className="text-sm text-accent hover:underline">
              View all →
            </Link>
          </div>

          {recentTerms.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {recentTerms.map((term) => {
                const script = scriptOfLanguage(term.language);
                return (
                  <li key={savedTermKey(term)}>
                    <Link
                      href={wordHref(term.strongs, term.form)}
                      className="flex items-center gap-2 rounded-lg border border-rule bg-paper-raised px-3 py-2 transition-colors hover:border-rule-strong"
                    >
                      <span
                        className={`${script === "hebrew" ? "font-hebrew text-hebrew" : "font-greek text-greek"} text-lg`}
                        dir={script === "hebrew" ? "rtl" : "ltr"}
                      >
                        {term.form ?? term.lemma}
                      </span>
                      <span className="text-sm text-ink-soft">{term.gloss?.split(";")[0]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {recentPassages.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {recentPassages.map((passage) => {
                const book = BOOKS_BY_ID.get(passage.bookId);
                const href = book
                  ? `/verse/${book.slug}/${passage.chapter}/${passage.verses.join(",")}`
                  : "/library";
                return (
                  <li key={savedPassageKey(passage)}>
                    <Link
                      href={href}
                      className="flex items-baseline gap-3 text-sm transition-colors hover:text-accent"
                    >
                      <span className="text-ink">{passage.ref}</span>
                      {passage.excerpt && (
                        <span className="min-w-0 truncate text-xs text-ink-faint">
                          {passage.excerpt}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {recentNotes.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {recentNotes.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/library#${note.id}`}
                    className="flex items-baseline gap-3 text-sm transition-colors hover:text-accent"
                  >
                    <span className="text-ink">{note.title}</span>
                    {note.ref && <span className="text-xs text-ink-faint">{note.ref}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
