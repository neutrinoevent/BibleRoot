"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { describeParsing, scriptOf, type AnnotatedWord } from "@/lib/render";

interface Props {
  word: AnnotatedWord;
  anchor: DOMRect;
  pinned: boolean;
  onClose: () => void;
}

const CARD_WIDTH = 320;
const GAP = 10;

export function WordPopover({ word, anchor, pinned, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // Measure first, then place: the card is clamped to the viewport and flips
  // above the word when there is not enough room below.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const height = element.offsetHeight;
    const left = Math.min(
      Math.max(GAP, anchor.left + anchor.width / 2 - CARD_WIDTH / 2),
      window.innerWidth - CARD_WIDTH - GAP,
    );
    const below = anchor.bottom + GAP;
    const flip = below + height > window.innerHeight - GAP && anchor.top - height - GAP > GAP;
    setPosition({ left, top: flip ? anchor.top - height - GAP : below });
  }, [anchor]);

  const script = scriptOf(word);
  const accent = script === "greek" ? "text-greek" : "text-hebrew";
  const parsing = describeParsing(word);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Original language for “${word.english?.trim()}”`}
      style={{
        width: CARD_WIDTH,
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
      className="fixed z-50 rounded-xl border border-rule-strong bg-paper-raised p-4 shadow-xl shadow-black/10"
    >
      {word.original ? (
        <p
          className={`${script === "hebrew" ? "font-hebrew" : "font-greek"} ${accent} text-2xl`}
          lang={script === "hebrew" ? "he" : "el"}
        >
          {word.original}
        </p>
      ) : (
        <p className="text-sm text-ink-faint">No original-language word aligned here.</p>
      )}

      {word.translit && (
        <p className="mt-1 font-serif text-sm italic text-ink-soft">{word.translit}</p>
      )}

      <dl className="mt-3 space-y-1.5 border-t border-rule pt-3 text-sm">
        {word.gloss && (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-ink-faint">Gloss</dt>
            <dd className="line-clamp-2 text-ink">{word.gloss}</dd>
          </div>
        )}
        {parsing && (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-ink-faint">Form</dt>
            <dd className="text-ink-soft">{parsing}</dd>
          </div>
        )}
        {word.strongs && (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-ink-faint">Root</dt>
            <dd className="text-ink-soft">
              <span className={`font-mono text-xs ${accent}`}>{word.strongs}</span>
              {word.occurrences ? (
                <span className="ml-2 text-xs text-ink-faint">
                  {word.occurrences.toLocaleString()}× in Scripture
                </span>
              ) : null}
            </dd>
          </div>
        )}
      </dl>

      {word.definition && (
        // Clamped so a long entry cannot grow the card over the verse being
        // read; the full text is on the term page.
        <p className="mt-3 line-clamp-3 border-t border-rule pt-3 text-sm leading-snug text-ink-soft">
          {word.definition}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-rule pt-3">
        {word.strongs ? (
          <Link
            href={`/term/${word.strongs}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            Go deeper →
          </Link>
        ) : (
          <span className="text-xs text-ink-faint">No lexicon entry</span>
        )}
        {pinned && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            Close (Esc)
          </button>
        )}
      </div>

      {!pinned && (
        <p className="mt-2 text-[11px] text-ink-faint">Click the word to keep this open</p>
      )}
    </div>
  );
}
