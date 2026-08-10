"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { togglePassageAction } from "@/app/actions";
import type { SavePassageInput } from "@/lib/library";

interface Props {
  passage: SavePassageInput;
  initiallySaved: boolean;
}

/**
 * Keeps a verse, or a set of verses being read together, for later.
 *
 * Saving is separate from writing a note. A reader often knows a passage matters
 * before they know what they want to say about it, and asking them to compose
 * something first loses the verse while they think.
 */
export function SavePassageButton({ passage, initiallySaved }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  const many = passage.verses.length > 1;
  const what = many ? "these verses" : "this verse";

  function toggle() {
    startTransition(async () => {
      const result = await togglePassageAction(passage);
      setSaved(result.saved);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      title={saved ? `Remove ${what} from your library` : `Keep ${what} in your library`}
      className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        saved
          ? "border-accent bg-highlight text-ink"
          : "border-rule-strong bg-paper-raised text-ink-soft hover:text-ink"
      }`}
    >
      {saved ? `★ ${many ? "These verses are" : "This verse is"} saved` : `☆ Save ${what}`}
    </button>
  );
}
