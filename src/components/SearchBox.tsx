"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { parseInput, chapterHref, verseHref } from "@/lib/refs";

interface Props {
  initialValue?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

/**
 * Accepts either a reference ("Proverbs 20:22", "prov 20.22") or pasted verse
 * text, and routes accordingly. Parsing happens here so a reference navigates
 * straight to the verse without a round trip through search.
 */
export function SearchBox({
  initialValue = "",
  autoFocus = false,
  placeholder = "Paste a verse, or type a reference like Proverbs 20:22",
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseInput(value);
    if (!parsed) return;

    if (parsed.kind === "verse") {
      router.push(verseHref(parsed.book, parsed.chapter, parsed.verse));
    } else if (parsed.kind === "chapter") {
      router.push(chapterHref(parsed.book, parsed.chapter));
    } else {
      router.push(`/search?q=${encodeURIComponent(parsed.query)}`);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full gap-2">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Verse reference or text"
        spellCheck={false}
        className="min-w-0 flex-1 rounded-lg border border-rule-strong bg-paper-raised px-4 py-3 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85"
      >
        Open
      </button>
    </form>
  );
}
