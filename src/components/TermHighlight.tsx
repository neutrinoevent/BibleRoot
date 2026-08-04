"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface HighlightState {
  active: string | null;
  toggle: (strongs: string) => void;
  clear: () => void;
}

const TermHighlightContext = createContext<HighlightState>({
  active: null,
  toggle: () => {},
  clear: () => {},
});

/**
 * Holds the root currently being traced across a selection of verses, so that
 * picking it out in one verse lights it up in all of them.
 */
export function TermHighlightProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<string | null>(null);

  const value = useMemo<HighlightState>(
    () => ({
      active,
      toggle: (strongs: string) => setActive((current) => (current === strongs ? null : strongs)),
      clear: () => setActive(null),
    }),
    [active],
  );

  return <TermHighlightContext value={value}>{children}</TermHighlightContext>;
}

export function useTermHighlight(): HighlightState {
  return useContext(TermHighlightContext);
}
