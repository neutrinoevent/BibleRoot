import { lexiconTitle, type DeepLexiconEntry } from "@/lib/corpus";

interface Props {
  entries: DeepLexiconEntry[];
}

/**
 * Full entries from the scholarly lexicons. The HTML was generated from a fixed
 * whitelist at import time — every text node escaped, no source attribute
 * copied through — so it is trusted here. Scripture citations inside the entry
 * are already in-app links.
 */
export function DeepLexicon({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-lg">Scholarly lexicons</h2>
      <p className="mt-1 text-sm text-ink-faint">
        Full entries. Verse citations inside them open here.
      </p>

      <div className="mt-4 space-y-4">
        {entries.map((entry) => {
          const { title, attribution } = lexiconTitle(entry.source);
          return (
            <details
              key={entry.source}
              open={entries.length === 1}
              className="group rounded-xl border border-rule bg-paper-raised"
            >
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-5 py-4">
                <span>
                  <span className="font-serif text-base text-ink">{title}</span>
                  <span className="ml-2 text-xs text-ink-faint">{attribution}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {entry.citation}
                  <span className="ml-2 inline-block transition-transform group-open:rotate-90">
                    ›
                  </span>
                </span>
              </summary>
              <div
                className="lex-entry border-t border-rule px-5 py-4"
                dangerouslySetInnerHTML={{ __html: entry.html }}
              />
            </details>
          );
        })}
      </div>
    </section>
  );
}
