"use client";

import { useEffect, useRef, useState } from "react";

import { alignWordsToText, type AnnotatedWord } from "@/lib/render";
import { WordPopover } from "./WordPopover";

interface Props {
  words: AnnotatedWord[];
  /** The published verse text. Word chunks are laid over it. */
  text: string;
  /** Poetry reads better broken into lines; prose reads better as a block. */
  poetry?: boolean;
}

interface Active {
  index: number;
  anchor: DOMRect;
  pinned: boolean;
}

const CLOSE_DELAY = 120;

function indentFor(para: string | null): number {
  if (!para) return 0;
  if (para.startsWith("indent2") || para === "indentred2") return 2;
  if (para.startsWith("indent1") || para === "indentred1" || para.startsWith("list")) return 1;
  if (para === "selah") return 3;
  return 0;
}

function startsLine(para: string | null): boolean {
  if (!para) return false;
  return (
    para.startsWith("indent") || para.startsWith("list") || para === "selah" || para === "tab1stline"
  );
}

export function ReadingLine({ words, text, poetry = false }: Props) {
  const segments = alignWordsToText(words, text);
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
        {segments.map((segment, order) => {
          if (segment.wordIndex === null) {
            return <span key={order}>{segment.text}</span>;
          }

          const word = words[segment.wordIndex];
          const isActive = active?.index === segment.wordIndex;
          const hasRoot = Boolean(word.strongs);
          const lineBreak = poetry && order > 0 && startsLine(word.para);
          const indent = indentFor(word.para);

          return (
            <span key={order}>
              {lineBreak && (
                <>
                  <br />
                  {indent > 0 && (
                    <span
                      aria-hidden
                      style={{ display: "inline-block", width: `${indent * 1.25}rem` }}
                    />
                  )}
                </>
              )}
              <button
                type="button"
                data-word-chunk={segment.wordIndex}
                onPointerEnter={(event) => show(segment.wordIndex!, event.currentTarget)}
                onPointerLeave={scheduleClose}
                onFocus={(event) => show(segment.wordIndex!, event.currentTarget)}
                onBlur={scheduleClose}
                onClick={(event) => show(segment.wordIndex!, event.currentTarget, true)}
                aria-expanded={isActive}
                title={segment.supplied ? "Supplied by the translators for sense" : undefined}
                className={`cursor-pointer rounded-[3px] px-[1px] transition-colors duration-100 ${
                  segment.supplied ? "text-ink-soft" : ""
                } ${
                  isActive
                    ? "bg-highlight"
                    : hasRoot
                      ? "decoration-rule-strong decoration-dotted underline-offset-[6px] hover:bg-highlight hover:underline"
                      : "hover:bg-paper-sunken"
                }`}
              >
                {segment.text}
              </button>
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
