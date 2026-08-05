import Link from "next/link";

interface Props {
  text: string;
  /** Strong's ids known to exist, so a citation never links into a 404. */
  known: Set<string>;
  className?: string;
}

const CITATION = /\b([HG])(\d{1,5})\b/g;

/**
 * Lexicon prose cites other entries by number — "from the same as H1951 (הוּן)
 * in the sense of H202 (אוֹן)". Those are the trail the lexicographer left, so
 * they are rendered as links to the entries they name.
 */
export function LexiconText({ text, known, className }: Props) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(CITATION)) {
    const id = `${match[1]}${Number(match[2])}`;
    if (!known.has(id)) continue;

    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    nodes.push(
      <Link
        key={`${match.index}-${id}`}
        href={`/term/${id}`}
        className="text-accent decoration-dotted underline-offset-2 hover:underline"
      >
        {match[0]}
      </Link>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <span className={className}>{nodes}</span>;
}

/** Collects the entries a passage of lexicon prose refers to. */
export function citedStrongs(...passages: Array<string | null>): string[] {
  const ids = new Set<string>();
  for (const passage of passages) {
    if (!passage) continue;
    for (const match of passage.matchAll(CITATION)) {
      ids.add(`${match[1]}${Number(match[2])}`);
    }
  }
  return [...ids];
}
