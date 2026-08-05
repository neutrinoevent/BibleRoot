"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleTermAction } from "@/app/actions";
import type { SaveTermInput } from "@/lib/library";

interface Props {
  term: SaveTermInput;
  initiallySaved: boolean;
}

export function SaveTermButton({ term, initiallySaved }: Props) {
  // Saving a form and saving its root are independent; the label says which.
  const isForm = Boolean(term.form);
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleTermAction(term);
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
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        saved
          ? "border-accent bg-highlight text-ink"
          : "border-rule-strong bg-paper-raised text-ink-soft hover:text-ink"
      }`}
    >
      {saved
        ? isForm
          ? "★ This form is saved"
          : "★ This word is saved"
        : isForm
          ? "☆ Save this form"
          : "☆ Save this word"}
    </button>
  );
}
