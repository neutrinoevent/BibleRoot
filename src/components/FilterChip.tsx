"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  /** Where a plain click goes: this one on its own. */
  href: string;
  /** Where a ⌘ or Ctrl click goes: this one added to, or taken out of, the rest. */
  toggleHref: string;
  selected: boolean;
  title: string;
  children: ReactNode;
}

/**
 * One narrowing choice — a book, or a wording.
 *
 * A plain click shows that one on its own, which is what someone expects from
 * something that looks like a button. Holding ⌘ or Ctrl adds it to what is
 * already chosen, or takes it back out, so several can be held together.
 *
 * Both destinations are ordinary addresses and the plain one is the `href`, so
 * the chip still works with no JavaScript, can be opened in a new tab from the
 * context menu, and can be shared as a link.
 */
export function FilterChip({ href, toggleHref, selected, title, children }: Props) {
  const router = useRouter();

  return (
    <Link
      href={href}
      aria-pressed={selected}
      title={`${title} — hold ⌘ or Ctrl to choose more than one`}
      onClick={(event) => {
        if (!event.metaKey && !event.ctrlKey) return;
        // Without this the browser would open a new tab and the choice would be
        // made in a window the reader is not looking at.
        event.preventDefault();
        router.push(toggleHref, { scroll: false });
      }}
      className={`flex items-baseline gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
        selected
          ? "border-accent bg-paper-raised text-accent"
          : "border-rule bg-paper-raised text-ink hover:border-rule-strong"
      }`}
    >
      {children}
      {selected && (
        <span aria-hidden className="text-xs text-accent">
          ×
        </span>
      )}
    </Link>
  );
}
