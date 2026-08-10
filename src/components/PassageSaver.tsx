"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  removePassagesAction,
  savePassagesAction,
  togglePassageAction,
} from "@/app/actions";
import { savedPassageKey } from "@/lib/passage-key";

export interface SaveableVerse {
  number: number;
  ref: string;
  text: string;
}

interface Props {
  bookId: number;
  chapter: number;
  verses: SaveableVerse[];
  /** Keys of every passage already kept from this chapter. */
  savedKeys: string[];
}

/**
 * Keeping some or all of the verses on the page, as one passage or as several.
 *
 * Two readers want different things from the same selection. One is gathering a
 * thread — three verses that belong together and mean less apart — and wants a
 * single entry. Another has read a chapter and wants four separate verses kept,
 * each to return to on its own. Neither is a special case of the other, so both
 * are offered, and the verses saved need not be all the ones on the page.
 */
export function PassageSaver({ bookId, chapter, verses, savedKeys }: Props) {
  const router = useRouter();
  const [ticked, setTicked] = useState<number[]>(() => verses.map((verse) => verse.number));
  const [pending, startTransition] = useTransition();
  const [said, setSaid] = useState<string | null>(null);

  const saved = useMemo(() => new Set(savedKeys), [savedKeys]);
  const chosen = useMemo(
    () => verses.filter((verse) => ticked.includes(verse.number)),
    [verses, ticked],
  );
  const numbers = chosen.map((verse) => verse.number);

  const groupSaved = numbers.length > 0 && saved.has(savedPassageKey({ bookId, chapter, verses: numbers }));
  const singlesSaved = chosen.filter((verse) =>
    saved.has(savedPassageKey({ bookId, chapter, verses: [verse.number] })),
  );
  const allSinglesSaved = chosen.length > 0 && singlesSaved.length === chosen.length;
  const single = numbers.length === 1;

  function toggle(number: number) {
    setSaid(null);
    setTicked((current) =>
      current.includes(number) ? current.filter((n) => n !== number) : [...current, number],
    );
  }

  function run(work: () => Promise<string>) {
    startTransition(async () => {
      setSaid(await work());
      router.refresh();
    });
  }

  const label = (list: SaveableVerse[]) =>
    list.length === 1 ? `verse ${list[0].number}` : `verses ${list.map((v) => v.number).join(", ")}`;

  function saveGroup() {
    run(async () => {
      const result = await togglePassageAction({
        ref: `${verses[0].ref.replace(/:\d+.*$/, "")}:${numbers.join(", ")}`,
        bookId,
        chapter,
        verses: numbers,
        excerpt: chosen[0].text,
      });
      if (chosen.length === 1) {
        return result.saved
          ? `Kept ${label(chosen)}.`
          : `Verse ${numbers[0]} is no longer saved.`;
      }
      return result.saved
        ? `Kept ${label(chosen)} together as one passage.`
        : "That group is no longer saved. Anything saved on its own is untouched.";
    });
  }

  function saveSeparately() {
    run(async () => {
      if (allSinglesSaved) {
        const result = await removePassagesAction(
          chosen.map((verse) => ({ bookId, chapter, verses: [verse.number] })),
        );
        return `Removed ${result.removed} separately saved verse${result.removed === 1 ? "" : "s"}. Any group is untouched.`;
      }
      const result = await savePassagesAction(
        chosen.map((verse) => ({
          ref: verse.ref,
          bookId,
          chapter,
          verses: [verse.number],
          excerpt: verse.text,
        })),
      );
      const parts = [`Kept ${result.saved} verse${result.saved === 1 ? "" : "s"} on its own`];
      if (result.already > 0) parts.push(`${result.already} was already saved`);
      return `${parts.join("; ")}.`;
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-rule bg-paper-raised p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-base text-ink">Keep these for later</h2>
        <span className="text-xs text-ink-faint">
          {ticked.length} of {verses.length} chosen
          {ticked.length > 0 && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => {
                  setSaid(null);
                  setTicked([]);
                }}
                className="text-accent hover:underline"
              >
                none
              </button>
            </>
          )}
          {ticked.length < verses.length && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => {
                  setSaid(null);
                  setTicked(verses.map((verse) => verse.number));
                }}
                className="text-accent hover:underline"
              >
                all
              </button>
            </>
          )}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {verses.map((verse) => {
          const on = ticked.includes(verse.number);
          const keptAlone = saved.has(savedPassageKey({ bookId, chapter, verses: [verse.number] }));
          return (
            <li key={verse.number}>
              <label className="flex cursor-pointer items-baseline gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(verse.number)}
                  className="mt-1 size-4 shrink-0 accent-current text-accent"
                />
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-ink">{verse.number}</span>{" "}
                  <span className="text-ink-soft">{verse.text}</span>
                  {keptAlone && (
                    <span className="ml-2 whitespace-nowrap text-xs text-accent">★ saved</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {/* One verse is one verse: a group of it and it on its own are the same
            entry, so offering both would be two buttons doing one thing. */}
        {single ? (
          <button
            type="button"
            onClick={saveGroup}
            disabled={pending}
            className="rounded-lg border border-rule-strong bg-paper-sunken px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent disabled:opacity-40"
          >
            {groupSaved ? `★ Remove verse ${numbers[0]}` : `Save verse ${numbers[0]}`}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={saveGroup}
              disabled={pending || numbers.length === 0}
              className="rounded-lg border border-rule-strong bg-paper-sunken px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent disabled:opacity-40"
            >
              {groupSaved ? "★ Remove this group" : "Save them together as one passage"}
            </button>
            <button
              type="button"
              onClick={saveSeparately}
              disabled={pending || numbers.length === 0}
              className="rounded-lg border border-rule-strong bg-paper-sunken px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent disabled:opacity-40"
            >
              {allSinglesSaved
                ? `★ Remove the ${numbers.length} saved on their own`
                : `Save each of the ${numbers.length} on its own`}
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        {said ??
          (numbers.length === 0
            ? "Choose at least one verse to keep."
            : single
              ? "One verse on its own. Tick another and you can keep them as a group as well."
              : "A group is one entry in your library and holds the verses together, even when they are scattered through the chapter. Saved on their own, each verse stands alone. Both can be true of the same verse, and removing one never removes the other.")}
      </p>
    </section>
  );
}
