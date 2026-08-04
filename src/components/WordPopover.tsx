"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { wordHref } from "@/lib/refs";
import { describeParsing, scriptOf, type AnnotatedWord } from "@/lib/render";

interface Props {
  word: AnnotatedWord;
  anchor: DOMRect;
  pinned: boolean;
  onClose: () => void;
  /** Pointer is on the card or heading for it; hold it open. */
  onStay: () => void;
  /** Pointer has left both; start the usual close countdown. */
  onLeave: () => void;
}

const CARD_WIDTH = 320;
const GAP = 10;

export function WordPopover({
  word,
  anchor,
  pinned,
  onClose,
  onStay,
  onLeave,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [height, setHeight] = useState(0);

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
    const flip =
      below + height > window.innerHeight - GAP &&
      anchor.top - height - GAP > GAP;

    // With a short viewport the card may fit neither below nor above. Left
    // alone it runs off the bottom of the screen, taking "Go deeper" with it,
    // so the placement is clamped into view as a last resort.
    const preferred = flip ? anchor.top - height - GAP : below;
    const top = Math.max(
      GAP,
      Math.min(preferred, window.innerHeight - height - GAP),
    );

    setPosition({ left, top });
    setHeight(height);
  }, [anchor]);

  /*
   * The gap between the word and the card is only a few pixels, but the next
   * line of the verse sits right underneath it. Without cover, a pointer
   * travelling down to "Go deeper" crosses another word first and swaps the
   * card out. This invisible strip spans the gap, wide enough to take a
   * diagonal path, so the journey never touches the text.
   */
  const bridge = (() => {
    if (!position) return null;
    const left = Math.min(anchor.left, position.left);
    const right = Math.max(anchor.right, position.left + CARD_WIDTH);
    const above = position.top >= anchor.bottom;
    const top = above ? anchor.bottom : position.top + height;
    const bottom = above ? position.top : anchor.top;
    return {
      left,
      top: top - 1,
      width: right - left,
      height: Math.max(0, bottom - top) + 2,
    };
  })();

  const script = scriptOf(word);
  const accent = script === "greek" ? "text-greek" : "text-hebrew";
  const parsing = describeParsing(word);

  return (
    <>
      {bridge && bridge.height > 0 && (
        <div
          aria-hidden
          onPointerEnter={onStay}
          onPointerLeave={onLeave}
          style={{
            position: "fixed",
            left: bridge.left,
            top: bridge.top,
            width: bridge.width,
            height: bridge.height,
          }}
          className="z-40"
        />
      )}

      <div
        ref={ref}
        onPointerEnter={onStay}
        onPointerLeave={onLeave}
        role="dialog"
        aria-label={`Original language for “${word.english?.trim()}”`}
        style={{
          width: CARD_WIDTH,
          maxHeight: "calc(100vh - 20px)",
          overflowY: "auto",
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
          <p className="text-sm text-ink-faint">
            No original-language word aligned here.
          </p>
        )}

        {word.translit && (
          <p className="mt-1 font-serif text-sm italic text-ink-soft">
            {word.translit}
          </p>
        )}

        <dl className="mt-3 space-y-1.5 border-t border-rule pt-3 text-sm">
          {word.gloss && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-ink-faint">
                Gloss
              </dt>
              <dd className="line-clamp-2 text-ink">{word.gloss}</dd>
            </div>
          )}
          {parsing && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-ink-faint">
                Form
              </dt>
              <dd className="text-ink-soft">{parsing}</dd>
            </div>
          )}
          {word.strongs && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-ink-faint">
                Listed as
              </dt>
              <dd className="text-ink-soft">
                {/* The lexicon files this word under its dictionary form, which is
                  usually not the form standing in the verse. Naming it here
                  means the term page is not a surprise. */}
                {word.lemma && (
                  <span
                    className={`${script === "hebrew" ? "font-hebrew" : "font-greek"} ${accent} text-base`}
                    dir={script === "hebrew" ? "rtl" : "ltr"}
                  >
                    {word.lemma}
                  </span>
                )}
                <span className={`ml-2 font-mono text-xs ${accent}`}>
                  {word.strongs}
                </span>
                {word.occurrences ? (
                  <span className="ml-2 text-xs text-ink-faint">
                    {word.occurrences.toLocaleString()}× in this text
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
              // Carrying the surface form lets the term page open by explaining
              // how this form relates to the headword.
              href={wordHref(word.strongs, word.original)}
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
          <p className="mt-2 text-[11px] text-ink-faint">
            Click the word to keep this open
          </p>
        )}
      </div>
    </>
  );
}
