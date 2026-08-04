"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VerseRow {
  id: number;
  verse: number;
  text: string;
  heading: string | null;
}

interface Props {
  verses: VerseRow[];
  bookSlug: string;
  bookName: string;
  chapter: number;
  /** Arriving from a verse page starts selection with that verse ticked. */
  initialSelection?: number[];
}

/**
 * Selection uses visible checkboxes rather than modifier-clicks, so it works
 * the same way on a touch screen as on a desktop.
 */
export function ChapterVerses({
  verses,
  bookSlug,
  bookName,
  chapter,
  initialSelection = [],
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>(initialSelection);
  const [selecting, setSelecting] = useState(initialSelection.length > 0);

  function toggle(verse: number) {
    setSelected((current) =>
      current.includes(verse) ? current.filter((v) => v !== verse) : [...current, verse],
    );
  }

  const ordered = [...selected].sort((a, b) => a - b);

  function open() {
    if (ordered.length === 0) return;
    router.push(`/verse/${bookSlug}/${chapter}/${ordered.join(",")}`);
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
        <button
          type="button"
          onClick={() => {
            setSelecting((on) => !on);
            setSelected([]);
          }}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            selecting
              ? "border-rule-strong bg-paper-sunken text-ink"
              : "border-rule-strong bg-paper-raised text-ink hover:border-accent"
          }`}
        >
          {selecting ? "Cancel selection" : "☑ Select verses to study together"}
        </button>
        <span className="text-xs text-ink-faint">
          {selecting
            ? "Tick any verses, in any order — they need not be next to each other."
            : "Compare several verses at once, and see the words they share."}
        </span>
      </div>

      <div className="mt-6 space-y-1">
        {verses.map((verse) => {
          const isSelected = selected.includes(verse.verse);
          return (
            <div key={verse.id}>
              {verse.heading && (
                <h2 className="mb-2 mt-8 font-serif text-sm uppercase tracking-[0.12em] text-ink-faint">
                  {verse.heading}
                </h2>
              )}

              <div className="flex items-start gap-2">
                {selecting && (
                  <label className="mt-2 flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(verse.verse)}
                      aria-label={`Select verse ${verse.verse}`}
                      className="size-4 cursor-pointer accent-[var(--accent)]"
                    />
                  </label>
                )}

                {selecting ? (
                  <button
                    type="button"
                    onClick={() => toggle(verse.verse)}
                    className={`flex flex-1 gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      isSelected ? "bg-highlight" : "hover:bg-paper-sunken"
                    }`}
                  >
                    <span className="mt-1.5 w-7 shrink-0 text-right font-mono text-xs text-ink-faint">
                      {verse.verse}
                    </span>
                    <span className="font-serif text-[1.15rem] leading-relaxed text-ink">
                      {verse.text}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={`/verse/${bookSlug}/${chapter}/${verse.verse}`}
                    className="group flex flex-1 gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-paper-sunken"
                  >
                    <span className="mt-1.5 w-7 shrink-0 text-right font-mono text-xs text-ink-faint">
                      {verse.verse}
                    </span>
                    <span className="font-serif text-[1.15rem] leading-relaxed text-ink">
                      {verse.text}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selecting && ordered.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-4 rounded-xl border border-rule-strong bg-paper-raised px-4 py-3 shadow-lg shadow-black/10">
          <span className="text-sm text-ink">
            <span className="font-medium">
              {bookName} {chapter}:{ordered.join(", ")}
            </span>
            <span className="ml-2 text-ink-faint">
              {ordered.length} verse{ordered.length === 1 ? "" : "s"}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs text-ink-faint hover:text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={open}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85"
            >
              Open together
            </button>
          </div>
        </div>
      )}
    </>
  );
}
