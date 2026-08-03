"use client";

import { useEffect, useRef, useState } from "react";

import { buildDisplayPieces, type AnnotatedWord } from "@/lib/render";
import { WordPopover } from "./WordPopover";

interface Props {
  words: AnnotatedWord[];
  /** Poetry line breaks read well in Psalms; prose is better as one block. */
  poetry?: boolean;
}

interface Active {
  index: number;
  anchor: DOMRect;
  pinned: boolean;
}

const CLOSE_DELAY = 120;

export function ReadingLine({ words, poetry = false }: Props) {
  const pieces = buildDisplayPieces(words);
  const [active, setActive] = useState<Active | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  // A short grace period lets the pointer travel from the word into the card.
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setActive((current) => (current?.pinned ? current : null));
    }, CLOSE_DELAY);
  }

  function show(index: number, element: HTMLElement, pinned = false) {
    cancelClose();
    setActive({ index, anchor: element.getBoundingClientRect(), pinned });
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!active?.pinned) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-word-chunk]") && !target.closest("[role='dialog']")) {
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [active?.pinned]);

  // Keep the card glued to its word while scrolling or resizing.
  const activeIndex = active?.index ?? null;
  useEffect(() => {
    if (activeIndex === null) return;
    const reposition = () => {
      const element = document.querySelector<HTMLElement>(`[data-word-chunk="${activeIndex}"]`);
      if (!element) return;
      const anchor = element.getBoundingClientRect();
      setActive((current) => (current ? { ...current, anchor } : current));
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [activeIndex]);

  return (
    <>
      <p className="font-serif text-[1.6rem] leading-[1.75] text-ink sm:text-[1.75rem]">
        {pieces.map((piece, order) => {
          const hasRoot = Boolean(piece.word.strongs);
          const isActive = active?.index === piece.index;
          return (
            <span key={piece.index}>
              {poetry && piece.breakBefore && (
                <>
                  <br />
                  {piece.indent > 0 && (
                    <span
                      aria-hidden
                      style={{ display: "inline-block", width: `${piece.indent * 1.25}rem` }}
                    />
                  )}
                </>
              )}
              {order > 0 && !(poetry && piece.breakBefore) ? " " : ""}
              {piece.prefix}
              <button
                type="button"
                data-word-chunk={piece.index}
                onPointerEnter={(event) => show(piece.index, event.currentTarget)}
                onPointerLeave={scheduleClose}
                onFocus={(event) => show(piece.index, event.currentTarget)}
                onBlur={scheduleClose}
                onClick={(event) => show(piece.index, event.currentTarget, true)}
                aria-expanded={isActive}
                className={`cursor-pointer rounded-[3px] px-[1px] transition-colors duration-100 ${
                  isActive
                    ? "bg-highlight"
                    : hasRoot
                      ? "decoration-rule-strong decoration-dotted underline-offset-[6px] hover:bg-highlight hover:underline"
                      : "hover:bg-paper-sunken"
                }`}
              >
                {piece.text}
              </button>
              {piece.suffix}
            </span>
          );
        })}
      </p>

      {active && (
        <div onPointerEnter={cancelClose} onPointerLeave={scheduleClose}>
          <WordPopover
            word={words[active.index]}
            anchor={active.anchor}
            pinned={active.pinned}
            onClose={() => setActive(null)}
          />
        </div>
      )}
    </>
  );
}
