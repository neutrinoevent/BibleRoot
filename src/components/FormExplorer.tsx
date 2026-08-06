"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { InflectedForm } from "@/lib/corpus";
import type { GrammarNote, WordPart } from "@/lib/morphology";
import { hrefForBookId, wordHref } from "@/lib/refs";

interface Rendering {
  english: string;
  c: number;
}

interface Preview {
  ref: string;
  book_id: number;
  chapter: number;
  verse: number;
  text: string;
  english: string | null;
}

interface FormDetail {
  strongs: string;
  original: string;
  translit: string | null;
  parsing: string | null;
  language: "hebrew" | "greek";
  lemma: string | null;
  gloss: string | null;
  grammar: GrammarNote[];
  parts: WordPart[];
  renderings: Rendering[];
  total: number;
  occurrences: Preview[];
}

interface Props {
  strongs: string;
  forms: InflectedForm[];
  lemma: string | null;
  language: "hebrew" | "greek";
  /** Rendered with a marked border, e.g. the form the reader arrived from. */
  currentForm?: string | null;
  limit?: number;
}

/**
 * The forms of a word, each opening in place.
 *
 * Comparing forms means moving between them quickly, so opening one shows its
 * grammar and a few verses right here rather than loading a new page. The full
 * entry is one further click, for the form worth settling on.
 */
export function FormExplorer({
  strongs,
  forms,
  lemma,
  language,
  currentForm = null,
  limit = 40,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  // Every form opened is kept, so moving back and forth between them is instant.
  const [cache, setCache] = useState<Record<string, FormDetail>>({});
  const inflight = useRef(new Set<string>());

  const detail = open ? (cache[open] ?? null) : null;
  const loading = Boolean(open) && detail === null;

  const script = language === "greek" ? "font-greek text-greek" : "font-hebrew text-hebrew";
  const dir = language === "greek" ? "ltr" : "rtl";

  useEffect(() => {
    if (!open || cache[open] || inflight.current.has(open)) return;

    inflight.current.add(open);
    let cancelled = false;
    fetch(`/api/form/${strongs}/${encodeURIComponent(open)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FormDetail | null) => {
        if (!cancelled && data) setCache((current) => ({ ...current, [open]: data }));
      })
      .catch(() => {})
      .finally(() => {
        inflight.current.delete(open);
      });

    return () => {
      cancelled = true;
    };
  }, [open, cache, strongs]);

  const shown = forms.slice(0, limit);

  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-2">
        {shown.map((form) => {
          const isOpen = open === form.original;
          const isCurrent = currentForm?.toLowerCase() === form.original.toLowerCase();
          return (
            <li key={form.original}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : form.original)}
                aria-expanded={isOpen}
                aria-controls="form-detail"
                title={form.parsing_long ?? undefined}
                className={`block rounded-lg border px-3 py-2 text-center transition-colors ${
                  isOpen
                    ? "border-accent bg-highlight"
                    : isCurrent
                      ? "border-accent/60 bg-paper-raised"
                      : "border-rule bg-paper-raised hover:border-rule-strong"
                }`}
              >
                <span className={`${script} block text-lg`} dir={dir}>
                  {form.original}
                </span>
                <span className="block font-mono text-[10px] text-ink-faint">
                  {form.parsing ?? ""} · {form.c.toLocaleString()}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {forms.length > limit && (
        <p className="mt-2 text-xs text-ink-faint">and {forms.length - limit} more</p>
      )}

      {open && (
        <div
          id="form-detail"
          className="mt-4 rounded-xl border border-accent/50 bg-paper-raised p-5"
        >
          {loading && !detail && <p className="text-sm text-ink-faint">Opening…</p>}

          {detail && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p>
                  <span className={`${script} text-3xl`} dir={dir}>
                    {detail.original}
                  </span>
                  {detail.translit && (
                    <span className="ml-3 font-serif text-base italic text-ink-soft">
                      {detail.translit}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="text-xs text-ink-faint hover:text-ink"
                >
                  Close
                </button>
              </div>

              <p className="mt-1 text-sm text-ink-soft">{detail.parsing}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {detail.total.toLocaleString()} time{detail.total === 1 ? "" : "s"} in Scripture
              </p>

              {detail.parts.length > 0 && (
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule pt-3 text-sm">
                  <span className="text-xs uppercase tracking-wide text-ink-faint">Built from</span>
                  {detail.parts.map((part, index) => (
                    <span key={`${part.role}-${index}`} className="text-ink-soft">
                      {part.form && (
                        <span className={`${script} mr-1 text-base`} dir={dir}>
                          {part.form}
                        </span>
                      )}
                      {part.label}
                      {index < detail.parts.length - 1 && <span className="ml-2 text-ink-faint">+</span>}
                    </span>
                  ))}
                </p>
              )}

              {detail.grammar.length > 0 && (
                <dl className="mt-3 space-y-1.5 border-t border-rule pt-3 text-sm">
                  {detail.grammar.map((note) => (
                    <div key={note.term} className="flex gap-2">
                      <dt className="w-28 shrink-0 font-medium text-ink">{note.term}</dt>
                      <dd className="text-ink-soft">{note.meaning}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {detail.renderings.length > 0 && (
                <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                  <span className="text-xs uppercase tracking-wide text-ink-faint">Rendered</span>
                  {detail.renderings.map((rendering) => (
                    // Opens the form's own page with this wording already
                    // chosen, so the chips do the same thing in both places.
                    <Link
                      key={rendering.english}
                      href={`${wordHref(strongs, detail.original)}?as=${encodeURIComponent(rendering.english)}#occurrences`}
                      title={`See the verses rendered “${rendering.english}”`}
                      className="rounded-full border border-rule px-2.5 py-0.5 text-sm text-ink transition-colors hover:border-rule-strong hover:text-accent"
                    >
                      {rendering.english}
                      <span className="ml-1.5 text-xs text-ink-faint">{rendering.c}</span>
                    </Link>
                  ))}
                </p>
              )}

              {detail.occurrences.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-rule pt-3">
                  {detail.occurrences.map((occurrence) => (
                    <li key={occurrence.ref}>
                      <Link
                        href={hrefForBookId(
                          occurrence.book_id,
                          occurrence.chapter,
                          occurrence.verse,
                        )}
                        className="group block"
                      >
                        <span className="text-xs font-medium text-accent group-hover:underline">
                          {occurrence.ref}
                        </span>
                        {occurrence.english && (
                          <span className="ml-2 text-xs text-ink-faint">
                            “{occurrence.english}”
                          </span>
                        )}
                        <span className="mt-0.5 block font-serif text-[15px] leading-snug text-ink-soft">
                          {occurrence.text}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
                <span className="text-xs text-ink-faint">
                  {detail.total > detail.occurrences.length
                    ? `Showing ${detail.occurrences.length} of ${detail.total.toLocaleString()} verses`
                    : "Every verse shown"}
                </span>
                <Link
                  href={wordHref(strongs, detail.original)}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85"
                >
                  Study this form in full →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {lemma && (
        <p className="sr-only">All of these belong to the headword {lemma}.</p>
      )}
    </>
  );
}
