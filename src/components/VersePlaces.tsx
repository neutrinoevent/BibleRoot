import Link from "next/link";

import type { VersePlace } from "@/lib/library";
import { anchorHref } from "@/lib/verse-anchor";

interface Props {
  places: VersePlace[];
  /** The verse being read, so the list can say which entry is the one you are on. */
  current: string;
  verseLabel: string;
}

/**
 * The other places in the reader's library where this verse turns up.
 *
 * The same verse can be kept several times over and mean something different
 * each time — once on its own, once inside a set gathered for a sermon, once
 * among the verses of a study. Each keeps its own notes, and none of them
 * stands for the others. What was missing was any way to find out they were
 * there: a set saved last week is invisible from the verse it contains.
 */
export function VersePlaces({ places, current, verseLabel }: Props) {
  const elsewhere = places.filter((place) => place.id !== current);
  if (elsewhere.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg">{verseLabel} elsewhere in your library</h2>
        <Link
          href={`/library?verse=${encodeURIComponent(verseLabel)}`}
          className="text-sm text-accent hover:underline"
        >
          See all {places.length} together →
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-faint">
        You have kept this verse in {elsewhere.length} other{" "}
        {elsewhere.length === 1 ? "place" : "places"}. Each holds its own notes, and opening one
        does not disturb another.
      </p>

      <ul className="mt-3 space-y-2">
        {elsewhere.map((place) => (
          <li key={place.id}>
            <Link
              href={anchorHref(place.anchor)}
              className="block rounded-lg border border-rule bg-paper-raised px-4 py-3 transition-colors hover:border-rule-strong"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-serif text-base text-ink">{place.ref}</span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {place.alone
                    ? "on its own"
                    : `${place.anchor.verses.length} verses together`}
                  {place.kind === "note" && " · written about, not saved"}
                </span>
              </span>
              {/* What tells two entries apart is what the reader wrote on each,
                  not the verse text they share. */}
              {place.noteTitles.length > 0 ? (
                <span className="mt-1 block text-sm text-ink-soft">
                  {place.noteTitles.join(" · ")}
                </span>
              ) : (
                <span className="mt-1 block text-sm text-ink-faint">No notes on it yet</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
