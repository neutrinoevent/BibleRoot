/**
 * The sixteen verses that carry a number but no text in modern editions.
 *
 * Their numbering comes from Stephanus (1551), which followed later Greek
 * manuscripts. The earliest manuscripts do not have them, so the Berean text —
 * like almost every modern translation — prints them only in a footnote. Their
 * absence is a fact about the manuscript tradition, not a gap in this app, but
 * a study tool should show the reader the disputed text and the evidence rather
 * than a blank.
 *
 * Two sources supply that:
 *   - The Berean footnote on the preceding verse gives the text in the
 *     publisher's own wording, along with which traditions carry it.
 *   - STEPBible's amalgamated Greek NT gives the Greek word by word with
 *     Strong's numbers and the editions attesting each word, so these verses
 *     get the same hover, interlinear and term links as any other.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DisputedVerse {
  /** Canonical verse index, matching the Berean versification. */
  index: number;
  osis: string;
  bookName: string;
  chapter: number;
  verse: number;
}

export const DISPUTED_VERSES: DisputedVerse[] = [
  { index: 23722, osis: "Mat.17.21", bookName: "Matthew", chapter: 17, verse: 21 },
  { index: 23739, osis: "Mat.18.11", bookName: "Matthew", chapter: 18, verse: 11 },
  { index: 23933, osis: "Mat.23.14", bookName: "Matthew", chapter: 23, verse: 14 },
  { index: 24480, osis: "Mrk.7.16", bookName: "Mark", chapter: 7, verse: 16 },
  { index: 24583, osis: "Mrk.9.44", bookName: "Mark", chapter: 9, verse: 44 },
  { index: 24585, osis: "Mrk.9.46", bookName: "Mark", chapter: 9, verse: 46 },
  { index: 24667, osis: "Mrk.11.26", bookName: "Mark", chapter: 11, verse: 26 },
  { index: 24855, osis: "Mrk.15.28", bookName: "Mark", chapter: 15, verse: 28 },
  { index: 25688, osis: "Luk.17.36", bookName: "Luke", chapter: 17, verse: 36 },
  { index: 25953, osis: "Luk.23.17", bookName: "Luke", chapter: 23, verse: 17 },
  { index: 26215, osis: "Jhn.5.4", bookName: "John", chapter: 5, verse: 4 },
  { index: 27214, osis: "Act.8.37", bookName: "Acts", chapter: 8, verse: 37 },
  { index: 27477, osis: "Act.15.34", bookName: "Acts", chapter: 15, verse: 34 },
  { index: 27777, osis: "Act.24.7", bookName: "Acts", chapter: 24, verse: 7 },
  { index: 27929, osis: "Act.28.29", bookName: "Acts", chapter: 28, verse: 29 },
  { index: 28361, osis: "Rom.16.24", bookName: "Romans", chapter: 16, verse: 24 },
];

export interface TagntWord {
  position: number;
  greek: string;
  translit: string | null;
  gloss: string | null;
  strongs: string | null;
  /** TAGNT's own morphology code, used when Berean has no parsing to lend. */
  code: string | null;
  lemma: string | null;
  /** Which printed editions carry this word, e.g. "Treg+TR+Byz". */
  editions: string | null;
  /** K = traditional manuscripts, N = ancient, O = other editions. */
  wordType: string | null;
}

/** "G1085H" and "G1487G" are disambiguated tags; the base number is what we key on. */
function normalizeStrongs(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = /^([HG])0*(\d+)/i.exec(raw.trim());
  return match ? `${match[1].toUpperCase()}${Number(match[2])}` : null;
}

/** `Τοῦτο (Touto)` → the word and its transliteration. */
function splitGreek(cell: string | undefined): { greek: string; translit: string | null } {
  const value = (cell ?? "").trim();
  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(value);
  const raw = match ? match[1].trim() : value;
  // The last word of a verse carries the sentence punctuation and a paragraph
  // mark; neither belongs to the word itself.
  const greek = raw.replace(/[.,;:·¶\s]+$/u, "");
  return { greek, translit: match ? match[2].trim() || null : null };
}

/**
 * Reads the amalgamated Greek NT and returns the words of each requested verse.
 * Data lines look like:
 *   Mat.17.21#01=KO<TAB>Τοῦτο (Touto)<TAB>this<TAB>G3778=D-NSN<TAB>οὗτος=this<TAB>Treg+TR+Byz
 */
export async function readTagntVerses(
  sourceDir: string,
  files: string[],
  wanted: Set<string>,
): Promise<Map<string, TagntWord[]>> {
  const result = new Map<string, TagntWord[]>();

  for (const file of files) {
    const raw = await readFile(path.join(sourceDir, file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      // Lines beginning with "#" are the running-text and interlinear previews.
      if (!line || line.startsWith("#")) continue;
      const hash = line.indexOf("#");
      if (hash < 0) continue;

      const columns = line.split("\t");
      const marker = columns[0];
      const reference = marker.slice(0, hash);
      if (!wanted.has(reference)) continue;

      const positionMatch = /#(\d+)/.exec(marker);
      const typeMatch = /=([A-Za-z()]+)/.exec(marker);
      const { greek, translit } = splitGreek(columns[1]);
      if (!greek) continue;

      const [strongsRaw, code] = (columns[3] ?? "").split("=");
      const [lemmaRaw] = (columns[4] ?? "").split("=");

      const words = result.get(reference) ?? [];
      words.push({
        position: positionMatch ? Number(positionMatch[1]) : words.length + 1,
        greek,
        translit,
        gloss: (columns[2] ?? "").trim() || null,
        strongs: normalizeStrongs(strongsRaw),
        code: (code ?? "").trim() || null,
        lemma: (lemmaRaw ?? "").trim() || null,
        editions: (columns[5] ?? "").trim() || null,
        wordType: typeMatch ? typeMatch[1] : null,
      });
      result.set(reference, words);
    }
  }

  for (const words of result.values()) words.sort((a, b) => a.position - b.position);
  return result;
}

export interface FootnoteVerse {
  text: string;
  /** The traditions that carry it, e.g. "BYZ and TR". */
  attribution: string | null;
}

/**
 * Pulls one verse out of the Berean footnote that carries it. Verse numbers
 * inside the footnote were stored as ⟨n⟩ when the corpus was imported, so the
 * text belonging to a given verse runs from its own marker to the next one.
 */
export function extractFootnoteVerse(
  footnote: string | null,
  verseNumber: number,
): FootnoteVerse | null {
  if (!footnote) return null;

  const marker = new RegExp(`⟨\\s*${verseNumber}\\s*⟩`);
  const match = marker.exec(footnote);
  if (!match) return null;

  const start = match.index + match[0].length;
  const rest = footnote.slice(start);
  const next = /⟨\s*\d+\s*⟩/.exec(rest);
  const text = (next ? rest.slice(0, next.index) : rest)
    .replace(/\s+/g, " ")
    .replace(/^[\s;,]+/, "")
    .trim()
    // Trailing editorial remarks such as "; see Mark 9:29" or ". See Isaiah
    // 53:12 and Luke 22:37." belong to the note rather than to the verse.
    .replace(/[;.]?\s*\bsee\s+(?:[1-3]\s)?[A-Z][A-Za-z]+\s+\d+:\d+[^.]*\.?\s*$/i, (whole) =>
      whole.trimStart().startsWith(".") ? "." : "",
    )
    .trim();

  if (!text) return null;

  // The attesting traditions are named just before the quoted text.
  const before = footnote.slice(0, match.index);
  let attribution: string | null = null;
  const pattern = /\b([A-Z][A-Za-z]*(?:[,\s]+(?:and\s+)?[A-Z][A-Za-z]*)*)\s+includes?\b/g;
  for (let found = pattern.exec(before); found; found = pattern.exec(before)) {
    attribution = found[1].trim();
  }

  return { text, attribution };
}

/** Expands the abbreviations used in the footnotes into something readable. */
const TRADITIONS: Record<string, string> = {
  TR: "the Textus Receptus",
  BYZ: "the Byzantine Majority Text",
  NE: "the Nestlé edition",
  SBL: "the SBL Greek New Testament",
  WH: "Westcott and Hort",
  NA: "Nestlé-Aland",
};

export function describeAttribution(attribution: string | null): string | null {
  if (!attribution) return null;
  const parts = attribution
    .split(/[,\s]+and\s+|,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const named = parts.map((part) => TRADITIONS[part.toUpperCase()] ?? part);
  if (named.length === 0) return null;
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
}
