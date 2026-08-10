"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  value: string;
  /** Set when something was typed that could not be read as a reference. */
  unreadable: boolean;
}

/**
 * Find every entry that takes in one verse.
 *
 * A verse can be kept several times over — on its own, and inside any number of
 * gatherings — and each keeps its own notes. This asks the opposite question to
 * the rest of the library: not what is in an entry, but which entries a verse is
 * in.
 */
export function VerseFilter({ value, unreadable }: Props) {
  const router = useRouter();
  const [text, setText] = useState(value);

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = text.trim();
        router.push(trimmed ? `/library?verse=${encodeURIComponent(trimmed)}` : "/library");
      }}
    >
      <label className="block text-xs uppercase tracking-wide text-ink-faint" htmlFor="verse">
        Find everything about one verse
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="verse"
          name="verse"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="John 3:16"
          className="min-w-0 flex-1 rounded-lg border border-rule bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg border border-rule-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          Find
        </button>
      </div>
      {unreadable && (
        <p className="mt-2 text-sm text-ink-faint">
          That did not read as a single verse. Try something like “John 3:16”.
        </p>
      )}
    </form>
  );
}
