"use client";

import Link from "next/link";

import type { SharedRoot } from "@/lib/corpus";
import { wordHref } from "@/lib/refs";
import { useTermHighlight } from "./TermHighlight";

interface Props {
  roots: SharedRoot[];
  verseCount: number;
}

/**
 * What the selected verses have in common. Selecting a root traces it through
 * every verse above; the arrow opens it for study.
 */
export function SharedRoots({ roots, verseCount }: Props) {
  const { active, toggle, clear } = useTermHighlight();
  if (roots.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg">
          Words these verses share{" "}
          <span className="text-sm font-normal text-ink-faint">({roots.length})</span>
        </h2>
        {active && (
          <button type="button" onClick={clear} className="text-sm text-accent hover:underline">
            Clear highlight
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-faint">
        Roots appearing in more than one of the {verseCount} verses. Select one to trace it through
        each.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {roots.map((root) => {
          const isActive = active === root.strongs;
          const script = root.language === "greek" ? "font-greek text-greek" : "font-hebrew text-hebrew";
          return (
            <li
              key={root.strongs}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                isActive ? "border-accent bg-highlight" : "border-rule bg-paper-raised"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(root.strongs)}
                aria-pressed={isActive}
                className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
              >
                <span
                  className={`${script} shrink-0 text-lg`}
                  dir={root.language === "greek" ? "ltr" : "rtl"}
                >
                  {root.lemma ?? root.strongs}
                </span>
                <span className="truncate text-sm text-ink">{root.gloss?.split(";")[0]}</span>
                <span className="ml-auto shrink-0 text-xs text-ink-faint">
                  {root.verses} verses
                  {root.total > root.verses ? ` · ${root.total}×` : ""}
                </span>
              </button>
              <Link
                href={wordHref(root.strongs, root.sample)}
                aria-label={`Open ${root.lemma ?? root.strongs}`}
                className="shrink-0 text-sm text-accent hover:underline"
              >
                →
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
