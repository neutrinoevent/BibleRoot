import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getParticle, listParticles } from "@/lib/corpus";
import { PARTICLE_NOTES } from "@/lib/morphology";

interface Props {
  params: Promise<{ letter: string }>;
}

export async function generateStaticParams() {
  return listParticles().map((particle) => ({ letter: particle.letter }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { letter } = await params;
  const particle = getParticle(letter);
  if (!particle) return { title: "BibleRoot" };
  const note = PARTICLE_NOTES[particle.letter];
  return { title: `${particle.headword ?? note?.label ?? letter} — BibleRoot` };
}

/**
 * A page for one of the small words Hebrew writes joined to the next: the
 * article, the conjunctive waw, the prepositions, the interrogative and the
 * relative. They carry a great deal of the language and appear on almost every
 * page of the Old Testament, yet Strong's gave them no number, so they have
 * never had anywhere to live in a concordance built around those numbers.
 */
export default async function ParticlePage({ params }: Props) {
  const { letter } = await params;
  const particle = getParticle(letter);
  if (!particle) notFound();

  const note = PARTICLE_NOTES[particle.letter];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs uppercase tracking-wide text-ink-faint">Written joined to the next word</p>

      <header className="mt-2">
        <p className="font-hebrew w-fit text-5xl leading-tight text-hebrew" lang="he" dir="rtl">
          {note?.form ?? particle.headword}
        </p>
        {note && (
          <p className="mt-2 font-serif text-lg italic text-ink-soft">{note.label}</p>
        )}
        {particle.citation && (
          <p className="mt-1 text-sm text-ink-faint">
            <span className="font-mono">{particle.citation}</span>
          </p>
        )}
      </header>

      {note && <p className="mt-8 font-serif text-2xl leading-snug text-ink">{note.meaning}</p>}

      <p className="mt-6 border-t border-rule pt-6 text-sm leading-relaxed text-ink-soft">
        Hebrew attaches its short prepositions, its article and its conjunction to the front of a
        word rather than spacing them out, so this one never stands alone in the text. It has no
        Strong&apos;s number of its own; Brown-Driver-Briggs treats it in full below.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-lg">Brown-Driver-Briggs</h2>
        <p className="mt-1 text-sm text-ink-faint">
          A Hebrew and English Lexicon of the Old Testament (1906), reproduced in full. Every verse
          it cites is a link you can follow.
        </p>
        <div
          className="lex-entry mt-4 rounded-xl border border-rule bg-paper-raised px-5 py-4"
          dangerouslySetInnerHTML={{ __html: particle.html }}
        />
      </section>

      <nav className="mt-10 border-t border-rule pt-6">
        <h2 className="text-xs uppercase tracking-wide text-ink-faint">The others</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {listParticles()
            .filter((other) => other.letter !== particle.letter)
            .map((other) => {
              const otherNote = PARTICLE_NOTES[other.letter];
              return (
                <li key={other.id}>
                  <Link
                    href={`/particle/${other.letter}`}
                    className="flex items-baseline gap-2 rounded-lg border border-rule bg-paper-raised px-3 py-2 transition-colors hover:border-rule-strong"
                  >
                    <span className="font-hebrew text-lg text-hebrew" lang="he" dir="rtl">
                      {otherNote?.form ?? other.headword}
                    </span>
                    <span className="text-sm text-ink-soft">{otherNote?.label}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
