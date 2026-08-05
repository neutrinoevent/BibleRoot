import Link from "next/link";

import type { SeptuagintMatch } from "@/lib/corpus";

interface Props {
  matches: SeptuagintMatch[];
  /** The word the reader is looking at. */
  lemma: string | null;
  /** greek: what Hebrew lies behind it. hebrew: what Greek was used for it. */
  direction: "behind-greek" | "renderings-of-hebrew";
}

const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** Small counts read better spelled out in a sentence. */
function spellOut(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

function scriptClass(language: "hebrew" | "greek"): string {
  return language === "greek" ? "font-greek text-greek" : "font-hebrew text-hebrew";
}

function Matches({ matches }: { matches: SeptuagintMatch[] }) {
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {matches.map((match) => {
        const word = match.lemma ?? match.printed;
        const rtl = match.language !== "greek";
        return (
          <li key={match.strongs}>
            <Link
              href={`/term/${match.strongs}`}
              className="flex h-full items-baseline gap-3 rounded-lg border border-rule bg-paper-raised px-4 py-3 transition-colors hover:border-rule-strong"
            >
              <span
                className={`${scriptClass(match.language ?? "hebrew")} shrink-0 text-xl`}
                dir={rtl ? "rtl" : "ltr"}
                lang={rtl ? "he" : "el"}
              >
                {word}
              </span>
              <span className="min-w-0">
                {match.translit && (
                  <span className="block font-serif text-sm italic text-ink-soft">
                    {match.translit}
                  </span>
                )}
                <span className="block text-sm text-ink">{match.gloss?.split(";")[0]}</span>
              </span>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-faint">
                {match.strongs}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The Septuagint bridge.
 *
 * Shown plainly on a Greek word, where it is evidence about meaning: the men
 * who wrote the New Testament learned their Greek Bible from this translation.
 * Folded away on a Hebrew word, where it records what one group of translators
 * decided the Hebrew meant — worth knowing, but not the root, and not something
 * to meet before the lexicons.
 */
export function Septuagint({ matches, lemma, direction }: Props) {
  if (matches.length === 0) return null;
  const many = matches.length > 1;

  if (direction === "behind-greek") {
    return (
      <section className="mt-10">
        <h2 className="font-serif text-lg">In the Septuagint</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Two centuries or more before the New Testament, Jewish scholars translated the Hebrew
          Scriptures into Greek. They used{" "}
          <span className="font-greek text-greek" lang="el">
            {lemma}
          </span>{" "}
          where the Hebrew read {many ? `these ${spellOut(matches.length)} words` : "this word"}. The
          apostles grew up on that translation, so what it carried, their Greek carried too.
        </p>
        <Matches matches={matches} />
      </section>
    );
  }

  return (
    <details className="group mt-10 rounded-xl border border-rule bg-paper-raised">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-5 py-4">
        <span className="font-serif text-lg text-ink">Greek used for it in the Septuagint</span>
        <span className="shrink-0 text-xs text-ink-faint">
          {matches.length} word{many ? "s" : ""}
          <span className="ml-2 inline-block transition-transform group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="border-t border-rule px-5 py-4">
        <p className="text-sm text-ink-faint">
          When Greek translators met{" "}
          <span className="font-hebrew text-hebrew" dir="rtl" lang="he">
            {lemma}
          </span>
          , {many ? "these are the words they reached for" : "this is the word they reached for"}.
          Their choices show how the word was understood in their day, which is not the same as
          what it means. Only Greek words that also appear in the New Testament are listed.
        </p>
        <Matches matches={matches} />
      </div>
    </details>
  );
}
