import Link from "next/link";

import { wordHref } from "@/lib/refs";
import { describeParsing, hasEnglish, scriptOfLanguage, type AnnotatedWord } from "@/lib/render";

interface Props {
  words: AnnotatedWord[];
}

/**
 * The interlinear proper: source-language order, one column per word, with the
 * English underneath. Hebrew and Aramaic verses run right to left.
 */
export function InterlinearGrid({ words }: Props) {
  const ordered = [...words].sort((a, b) => a.src_pos - b.src_pos);
  const script = scriptOfLanguage(words[0]?.language);
  const rtl = script === "hebrew";

  return (
    <div className="overflow-x-auto">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="flex min-w-full flex-wrap gap-x-1 gap-y-4 py-2"
        lang={rtl ? "he" : "el"}
      >
        {ordered.map((word) => {
          const parsing = describeParsing(word);
          const accent = script === "greek" ? "text-greek" : "text-hebrew";
          const inner = (
            <>
              <span
                className={`${script === "hebrew" ? "font-hebrew" : "font-greek"} ${accent} text-2xl leading-tight`}
              >
                {word.original ?? "—"}
              </span>
              <span className="font-serif text-xs italic text-ink-soft" dir="ltr">
                {word.translit ?? ""}
              </span>
              <span className="text-sm text-ink" dir="ltr">
                {/* Words whose English is carried elsewhere fall back to their gloss. */}
                {hasEnglish(word) ? word.english!.trim() : word.gloss?.split(";")[0] ?? "—"}
              </span>
              <span className="font-mono text-[10px] text-ink-faint" dir="ltr">
                {word.strongs ?? ""}
              </span>
            </>
          );

          const shared =
            "flex min-w-[5.5rem] max-w-[11rem] flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors";

          return word.strongs ? (
            <Link
              key={word.pos}
              href={wordHref(word.strongs, word.original)}
              title={parsing ?? undefined}
              className={`${shared} hover:bg-paper-sunken`}
            >
              {inner}
            </Link>
          ) : (
            <div key={word.pos} title={parsing ?? undefined} className={shared}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
