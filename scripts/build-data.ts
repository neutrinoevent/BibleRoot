/**
 * Builds data/bibleroot.db from public interlinear + lexicon sources.
 *
 * Sources (downloaded once into data/sources/, then cached):
 *   - Berean Study Bible interlinear tables — word-level alignment between the
 *     BSB English and the Hebrew/Aramaic/Greek, with Strong's numbers.
 *   - Strong's Hebrew & Greek dictionaries (Open Scriptures, CC BY-SA).
 *   - Tyndale/STEPBible brief lexicons (CC BY) for concise modern glosses.
 *
 * Run with: npm run build:data
 */

import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, unlink } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";

import { BOOKS, BOOKS_BY_NAME } from "../src/lib/books.ts";
import {
  isEnglishPlaceholder,
  normalizeDashes,
  stripPlaceholderMarks,
  stripSuppliedMarkers,
} from "../src/lib/render.ts";
import { buildDeepLexicons, type DeepEntry } from "./deep-lexicons.ts";
import {
  DISPUTED_VERSES,
  describeAttribution,
  extractFootnoteVerse,
  readTagntVerses,
} from "./disputed-verses.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "data", "sources");
const DB_PATH = path.join(ROOT, "data", "bibleroot.db");

const SOURCES = [
  {
    file: "bsb_tables.xlsx",
    url: "https://bereanbible.com/bsb_tables.xlsx",
    label: "Berean interlinear tables (~55 MB)",
  },
  {
    file: "strongs-hebrew-dictionary.js",
    url: "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js",
    label: "Strong's Hebrew dictionary",
  },
  {
    file: "strongs-greek-dictionary.js",
    url: "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js",
    label: "Strong's Greek dictionary",
  },
  {
    file: "tbesh.txt",
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt",
    label: "Tyndale brief Hebrew lexicon",
  },
  {
    file: "tbesg.txt",
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt",
    label: "Tyndale brief Greek lexicon",
  },
  {
    file: "bsb.txt",
    url: "https://bereanbible.com/bsb.txt",
    label: "Berean Standard Bible, plain text (used to verify the assembled text)",
  },
  {
    file: "tagnt_mat_jhn.txt",
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt",
    label: "Amalgamated Greek NT, Matthew-John",
  },
  {
    file: "tagnt_act_rev.txt",
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt",
    label: "Amalgamated Greek NT, Acts-Revelation",
  },
  {
    file: "BrownDriverBriggs.xml",
    url: "https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml",
    label: "Brown-Driver-Briggs Hebrew lexicon",
  },
  {
    file: "LexicalIndex.xml",
    url: "https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/LexicalIndex.xml",
    label: "Hebrew lexical index (Strong's ↔ BDB ↔ TWOT)",
  },
  {
    file: "abbott-smith.tei.xml",
    url: "https://raw.githubusercontent.com/translatable-exegetical-tools/Abbott-Smith/master/abbott-smith.tei.xml",
    label: "Abbott-Smith Manual Greek Lexicon",
  },
];

/** Column positions in the Berean sheet. ExcelJS row.values is 1-indexed. */
const COL = {
  hebSort: 1,
  greekSort: 2,
  bsbSort: 3,
  verseIndex: 4,
  language: 5,
  original: 6,
  translit: 8,
  parsing: 9,
  parsingLong: 10,
  strongsHeb: 11,
  strongsGrk: 12,
  verseRef: 13,
  heading: 14,
  crossref: 15,
  para: 16,
  beginQuote: 18,
  english: 19,
  punctuation: 20,
  endQuote: 21,
  footnote: 22,
} as const;

const SHEET_NAME = "biblosinterlinear96";

function log(message: string) {
  console.log(`[build-data] ${message}`);
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function ensureSources() {
  await mkdir(SOURCE_DIR, { recursive: true });
  for (const source of SOURCES) {
    const target = path.join(SOURCE_DIR, source.file);
    if (await exists(target)) {
      log(`cached  ${source.file}`);
      continue;
    }
    log(`fetching ${source.label} …`);
    const response = await fetch(source.url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download ${source.url} (HTTP ${response.status})`);
    }
    const partial = `${target}.part`;
    const stream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    await pipeline(stream, createWriteStream(partial));
    const { rename } = await import("node:fs/promises");
    await rename(partial, target);
    log(`saved    ${source.file}`);
  }
}

function createSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = OFF;

    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS verses;
    DROP TABLE IF EXISTS words;
    DROP TABLE IF EXISTS strongs;
    DROP TABLE IF EXISTS lexicon_entries;
    DROP TABLE IF EXISTS meta;
    DROP TABLE IF EXISTS verses_fts;

    CREATE TABLE books (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE,
      osis       TEXT NOT NULL,
      testament  TEXT NOT NULL,
      chapters   INTEGER NOT NULL DEFAULT 0,
      verses     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE verses (
      id       INTEGER PRIMARY KEY,
      book_id  INTEGER NOT NULL REFERENCES books(id),
      chapter  INTEGER NOT NULL,
      verse    INTEGER NOT NULL,
      ref      TEXT NOT NULL,
      text     TEXT NOT NULL,
      heading  TEXT,
      crossref TEXT,
      footnote TEXT,
      -- Set on verses absent from the earliest manuscripts, naming the
      -- traditions that do carry them.
      disputed TEXT
    );
    CREATE UNIQUE INDEX verses_ref_idx ON verses(book_id, chapter, verse);

    CREATE TABLE words (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      verse_id      INTEGER NOT NULL REFERENCES verses(id),
      pos           INTEGER NOT NULL,
      src_pos       INTEGER NOT NULL,
      language      TEXT,
      original      TEXT,
      translit      TEXT,
      parsing       TEXT,
      parsing_long  TEXT,
      strongs       TEXT,
      english       TEXT,
      prefix        TEXT,
      suffix        TEXT,
      para          TEXT,
      editions      TEXT
    );
    CREATE INDEX words_verse_idx   ON words(verse_id, pos);
    CREATE INDEX words_strongs_idx ON words(strongs);

    CREATE TABLE strongs (
      id            TEXT PRIMARY KEY,
      language      TEXT NOT NULL,
      number        INTEGER NOT NULL,
      lemma         TEXT,
      translit      TEXT,
      pronunciation TEXT,
      gloss         TEXT,
      morph         TEXT,
      derivation    TEXT,
      definition    TEXT,
      kjv_usage     TEXT,
      twot          TEXT,
      occurrences   INTEGER NOT NULL DEFAULT 0
    );

    -- Full entries from the scholarly lexicons, pre-rendered to safe HTML.
    CREATE TABLE lexicon_entries (
      strongs   TEXT NOT NULL,
      source    TEXT NOT NULL,
      headword  TEXT,
      citation  TEXT,
      html      TEXT NOT NULL,
      PRIMARY KEY (strongs, source)
    );
    CREATE INDEX lexicon_entries_strongs_idx ON lexicon_entries(strongs);

    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

    CREATE VIRTUAL TABLE verses_fts USING fts5(
      ref, text, tokenize = 'unicode61 remove_diacritics 2'
    );
  `);
}

interface LexEntry {
  language: "hebrew" | "greek";
  number: number;
  lemma?: string;
  translit?: string;
  pronunciation?: string;
  gloss?: string;
  morph?: string;
  derivation?: string;
  definition?: string;
  kjvUsage?: string;
}

/** "H0001a" / "G0026" / "H7451A" all normalise to "H1" / "G26" / "H7451". */
function normalizeStrongsKey(raw: string): string | null {
  const match = /^([HG])0*(\d+)/i.exec(raw.trim());
  if (!match) return null;
  return `${match[1].toUpperCase()}${Number(match[2])}`;
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The English column occasionally carries presentation markup: paragraph tags
 * for poetry lines, and a `reftext` span holding the verse number that follows
 * a Psalm superscription. Both must go, the latter along with its contents.
 * Attributes in this source are quoted with `|` rather than `"`.
 */
function stripMarkup(value: string | null): string | null {
  if (value === null) return null;
  const cleaned = value
    .replace(/\|/g, '"')
    .replace(/<span class="reftext">[\s\S]*?<\/span>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  // Punctuation and quote marks carry meaningful spacing (e.g. " — "), so only
  // the markup is removed here — the surrounding whitespace is left intact.
  return cleaned.trim() ? cleaned : null;
}

function cleanText(value: string | null): string | null {
  const cleaned = stripMarkup(value);
  if (cleaned === null) return null;
  const collapsed = cleaned.replace(/\s+/g, " ").trim();
  return collapsed || null;
}

/**
 * `vvv` and `. . .` both mark a source word whose English is carried by a
 * neighbouring chunk. They are usually the whole cell, but occasionally sit
 * alongside real text, so the markers are stripped rather than the cell dropped.
 */
function cleanEnglish(value: string | null): string | null {
  return stripPlaceholderMarks(cleanText(value));
}

/** `<p class=|indent2|>` → `indent2`, used to rebuild poetry line breaks. */
function paragraphClass(value: string | null): string | null {
  if (!value) return null;
  const match = /class=[|"']?([a-z0-9_-]+)/i.exec(value);
  return match ? match[1] : null;
}

async function loadStrongsDictionary(
  file: string,
  language: "hebrew" | "greek",
  entries: Map<string, LexEntry>,
) {
  const raw = await readFile(path.join(SOURCE_DIR, file), "utf8");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error(`Unexpected format in ${file}`);
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<
    string,
    { lemma?: string; xlit?: string; translit?: string; pron?: string; derivation?: string; strongs_def?: string; kjv_def?: string }
  >;

  for (const [key, value] of Object.entries(parsed)) {
    const id = normalizeStrongsKey(key);
    if (!id) continue;
    const entry = entries.get(id) ?? { language, number: Number(id.slice(1)) };
    entry.lemma ??= value.lemma;
    entry.translit ??= value.xlit ?? value.translit;
    entry.pronunciation ??= value.pron;
    entry.derivation ??= value.derivation?.trim();
    entry.definition ??= value.strongs_def?.trim();
    entry.kjvUsage ??= value.kjv_def?.trim();
    entries.set(id, entry);
  }
}

/**
 * Tyndale lexicons are tab-separated with sub-sense rows (H7451a, H7451b).
 * We only take the concise gloss and morphology columns; the "Meaning" column
 * carries a separate permission requirement, so it is deliberately skipped.
 */
async function loadTyndaleLexicon(
  file: string,
  language: "hebrew" | "greek",
  entries: Map<string, LexEntry>,
) {
  const raw = await readFile(path.join(SOURCE_DIR, file), "utf8");
  const glosses = new Map<string, string[]>();

  for (const line of raw.split(/\r?\n/)) {
    if (!/^[HG]\d/.test(line)) continue;
    const cols = line.split("\t");
    const id = normalizeStrongsKey(cols[0]);
    if (!id) continue;

    const lemma = cols[3]?.trim();
    const translit = cols[4]?.trim();
    const morph = cols[5]?.trim();
    const gloss = cols[6]?.trim();

    const entry = entries.get(id) ?? { language, number: Number(id.slice(1)) };
    entry.lemma ??= lemma || undefined;
    entry.translit ??= translit || undefined;
    entry.morph ??= morph || undefined;
    entries.set(id, entry);

    if (gloss) {
      const list = glosses.get(id) ?? [];
      if (!list.includes(gloss)) list.push(gloss);
      glosses.set(id, list);
    }
  }

  for (const [id, list] of glosses) {
    const entry = entries.get(id);
    if (entry) entry.gloss ??= list.slice(0, 3).join("; ");
  }
}

async function importLexicons(db: DatabaseSync) {
  const entries = new Map<string, LexEntry>();
  await loadStrongsDictionary("strongs-hebrew-dictionary.js", "hebrew", entries);
  await loadStrongsDictionary("strongs-greek-dictionary.js", "greek", entries);
  await loadTyndaleLexicon("tbesh.txt", "hebrew", entries);
  await loadTyndaleLexicon("tbesg.txt", "greek", entries);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO strongs
      (id, language, number, lemma, translit, pronunciation, gloss, morph, derivation, definition, kjv_usage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  for (const [id, entry] of entries) {
    insert.run(
      id,
      entry.language,
      entry.number,
      entry.lemma ?? null,
      entry.translit ?? null,
      entry.pronunciation ?? null,
      entry.gloss ?? null,
      entry.morph ?? null,
      entry.derivation ?? null,
      entry.definition ?? null,
      entry.kjvUsage ?? null,
    );
  }
  db.exec("COMMIT");
  log(`imported ${entries.size.toLocaleString()} lexicon entries`);
}

/**
 * Brown-Driver-Briggs and Abbott-Smith: the entries a reader turns to when the
 * concise gloss is not enough.
 */
/**
 * The generated markup is rendered without a runtime sanitiser, so refuse to
 * ship anything that is not a balanced tree of the tags we emit ourselves.
 */
function assertWellFormed(entries: DeepEntry[]) {
  const malformed: string[] = [];
  for (const entry of entries) {
    const stack: string[] = [];
    for (const match of entry.html.matchAll(/<(\/?)([a-z]+)[^>]*>/g)) {
      if (match[1]) {
        if (stack.pop() !== match[2]) {
          malformed.push(`${entry.strongs}/${entry.source}`);
          break;
        }
      } else {
        stack.push(match[2]);
      }
    }
    if (stack.length > 0) malformed.push(`${entry.strongs}/${entry.source}`);
  }
  if (malformed.length > 0) {
    throw new Error(
      `${malformed.length} lexicon entries produced unbalanced markup (e.g. ${malformed
        .slice(0, 5)
        .join(", ")})`,
    );
  }
}

async function importDeepLexicons(db: DatabaseSync) {
  const { entries, twot } = await buildDeepLexicons(SOURCE_DIR);
  assertWellFormed(entries);

  const insert = db.prepare(
    "INSERT OR REPLACE INTO lexicon_entries (strongs, source, headword, citation, html) VALUES (?, ?, ?, ?, ?)",
  );
  const setTwot = db.prepare("UPDATE strongs SET twot = ? WHERE id = ?");

  db.exec("BEGIN");
  for (const entry of entries) {
    insert.run(entry.strongs, entry.source, entry.headword, entry.citation, entry.html);
  }
  for (const [strongs, number] of twot) setTwot.run(number, strongs);
  db.exec("COMMIT");

  const bdb = entries.filter((entry) => entry.source === "bdb").length;
  const greek = entries.length - bdb;
  log(`imported ${bdb.toLocaleString()} BDB and ${greek.toLocaleString()} Abbott-Smith entries`);
}

function importBooks(db: DatabaseSync) {
  const insert = db.prepare(
    "INSERT INTO books (id, name, slug, osis, testament) VALUES (?, ?, ?, ?, ?)",
  );
  db.exec("BEGIN");
  for (const book of BOOKS) {
    insert.run(book.id, book.name, book.slug, book.osis, book.testament);
  }
  db.exec("COMMIT");
}

interface RawWord {
  bsbSort: number;
  srcSort: number;
  language: string | null;
  original: string | null;
  translit: string | null;
  parsing: string | null;
  parsingLong: string | null;
  strongs: string | null;
  english: string | null;
  prefix: string | null;
  suffix: string | null;
  para: string | null;
}

/** ExcelJS hands back strings, numbers, or rich-text objects. Flatten them. */
function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null && "richText" in value) {
    const rich = (value as { richText: Array<{ text: string }> }).richText;
    return rich.map((part) => part.text).join("");
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: unknown }).text);
  }
  return String(value);
}

function cellNumber(value: unknown): number | null {
  const text = cellText(value);
  if (text === null) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

/**
 * Assembles the readable BSB sentence from its word chunks. Words with no
 * English of their own still contribute punctuation and quote marks, which get
 * folded onto the neighbouring chunk so nothing is dropped.
 */
function buildVerseText(words: RawWord[]): string {
  const pieces: string[] = [];
  let pendingPrefix = "";

  for (const word of words) {
    const english = word.english?.trim() ?? "";
    const visible = !isEnglishPlaceholder(english);
    const prefix = word.prefix ?? "";
    const suffix = word.suffix ?? "";

    if (visible) {
      pieces.push(`${pendingPrefix}${prefix}${english}${suffix}`);
      pendingPrefix = "";
    } else {
      pendingPrefix += prefix;
      if (suffix && pieces.length > 0) pieces[pieces.length - 1] += suffix;
      else pendingPrefix += suffix;
    }
  }

  if (pendingPrefix && pieces.length > 0) pieces[pieces.length - 1] += pendingPrefix;

  const joined = pieces
    .join(" ")
    .replace(/\s+/g, " ")
    // Opening marks hug the word that follows, closing marks the one before.
    .replace(/([“‘(])\s+/g, "$1")
    .replace(/\s+([,.;:!?”’)])/g, "$1");

  // The stored text is reading text, so the bracket markers come off here. They
  // stay on the individual words, where the interlinear still shows which parts
  // the translators supplied.
  return normalizeDashes(stripSuppliedMarkers(joined)).replace(/\s+/g, " ").trim();
}

async function importCorpus(db: DatabaseSync) {
  const insertVerse = db.prepare(`
    INSERT INTO verses (id, book_id, chapter, verse, ref, text, heading, crossref, footnote)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertWord = db.prepare(`
    INSERT INTO words
      (verse_id, pos, src_pos, language, original, translit, parsing, parsing_long, strongs, english, prefix, suffix, para)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare("INSERT INTO verses_fts (rowid, ref, text) VALUES (?, ?, ?)");

  const reader = new ExcelJS.stream.xlsx.WorkbookReader(
    path.join(SOURCE_DIR, "bsb_tables.xlsx"),
    { sharedStrings: "cache", worksheets: "emit", entries: "emit" },
  );

  let verseIndex = 0;
  let verseRef: string | null = null;
  let heading: string | null = null;
  let crossref: string | null = null;
  let footnote: string | null = null;
  let buffer: RawWord[] = [];
  let verseCount = 0;
  let wordCount = 0;
  let skipped = 0;

  db.exec("BEGIN");

  const flush = () => {
    if (verseIndex === 0 || buffer.length === 0) return;
    if (!verseRef) {
      skipped += 1;
      buffer = [];
      return;
    }
    const match = /^(.*?)\s+(\d+):(\d+)$/.exec(verseRef.trim());
    if (!match) {
      skipped += 1;
      buffer = [];
      return;
    }
    const book = BOOKS_BY_NAME.get(match[1].trim());
    if (!book) {
      skipped += 1;
      buffer = [];
      return;
    }

    const readingOrder = [...buffer].sort((a, b) => a.bsbSort - b.bsbSort);
    const text = buildVerseText(readingOrder);
    const chapter = Number(match[2]);
    const verse = Number(match[3]);
    const ref = `${book.name} ${chapter}:${verse}`;

    insertVerse.run(verseIndex, book.id, chapter, verse, ref, text, heading, crossref, footnote);
    insertFts.run(verseIndex, ref, text);
    verseCount += 1;

    const sourceOrder = [...buffer].sort((a, b) => a.srcSort - b.srcSort);
    const srcPosition = new Map(sourceOrder.map((word, index) => [word, index]));

    readingOrder.forEach((word, index) => {
      insertWord.run(
        verseIndex,
        index,
        srcPosition.get(word) ?? index,
        word.language,
        word.original,
        word.translit,
        word.parsing,
        word.parsingLong,
        word.strongs,
        word.english,
        word.prefix,
        word.suffix,
        word.para,
      );
      wordCount += 1;
    });

    buffer = [];
  };

  for await (const worksheet of reader) {
    // exceljs's streaming reader types omit `name`, but it is present at runtime.
    if ((worksheet as unknown as { name: string }).name !== SHEET_NAME) continue;

    for await (const row of worksheet) {
      const values = row.values as unknown[];
      const index = cellNumber(values[COL.verseIndex]);
      if (index === null) continue; // header row

      if (index !== verseIndex) {
        flush();
        verseIndex = index;
        verseRef = null;
        heading = null;
        crossref = null;
        footnote = null;
      }

      const refCell = cellText(values[COL.verseRef]);
      if (refCell) verseRef = refCell;

      const headingCell = cellText(values[COL.heading]);
      if (headingCell && !heading) {
        const plain = stripHtml(headingCell.replace(/\|/g, '"'));
        if (plain) heading = plain;
      }

      const footnoteCell = cellText(values[COL.footnote]);
      if (footnoteCell) {
        // Verse numbers inside a footnote are marked up; keep them as ⟨n⟩ so a
        // verse carried only in a footnote can still be located later.
        const plain = stripHtml(
          footnoteCell
            .replace(/\|/g, '"')
            .replace(/<span class="fnv">\s*(\d+)\s*<\/span>/gi, "⟨$1⟩"),
        );
        // The same footnote can repeat across a verse's rows.
        if (plain && !footnote?.includes(plain)) {
          footnote = footnote ? `${footnote} ${plain}` : plain;
        }
      }

      const crossrefCell = cellText(values[COL.crossref]);
      if (crossrefCell && !crossref) {
        const plain = stripHtml(crossrefCell.replace(/\|/g, '"'));
        if (plain) crossref = plain;
      }

      const original = cellText(values[COL.original])?.trim() || null;
      const rawEnglish = cellText(values[COL.english])?.trim() || null;
      const prefix = stripMarkup(cellText(values[COL.beginQuote]));
      const suffix = stripMarkup(
        `${cellText(values[COL.punctuation]) ?? ""}${cellText(values[COL.endQuote]) ?? ""}`,
      );

      if (!original && !rawEnglish) {
        // A row with no word of its own can still close a quotation. Fold that
        // punctuation onto the previous word rather than dropping the row.
        if ((prefix || suffix) && buffer.length > 0) {
          const last = buffer[buffer.length - 1];
          last.suffix = `${last.suffix ?? ""}${prefix ?? ""}${suffix ?? ""}` || null;
        }
        continue;
      }
      const english = cleanEnglish(rawEnglish);

      const language = cellText(values[COL.language])?.trim() || null;
      const hebNumber = cellNumber(values[COL.strongsHeb]);
      const grkNumber = cellNumber(values[COL.strongsGrk]);
      const strongs =
        grkNumber && grkNumber > 0
          ? `G${grkNumber}`
          : hebNumber && hebNumber > 0
            ? `H${hebNumber}`
            : null;

      const hebSort = cellNumber(values[COL.hebSort]) ?? 0;
      const grkSort = cellNumber(values[COL.greekSort]) ?? 0;

      buffer.push({
        bsbSort: cellNumber(values[COL.bsbSort]) ?? buffer.length,
        srcSort: language === "Greek" ? grkSort : hebSort,
        language,
        original,
        translit: cellText(values[COL.translit])?.trim() || null,
        parsing: cellText(values[COL.parsing])?.trim() || null,
        parsingLong: cellText(values[COL.parsingLong])?.trim() || null,
        strongs,
        english,
        prefix,
        suffix,
        para: paragraphClass(cellText(values[COL.para])),
      });

      if (verseCount > 0 && verseCount % 5000 === 0 && buffer.length === 1) {
        log(`… ${verseCount.toLocaleString()} verses`);
      }
    }
    break;
  }

  flush();
  db.exec("COMMIT");
  log(`imported ${verseCount.toLocaleString()} verses / ${wordCount.toLocaleString()} words`);
  if (skipped > 0) log(`skipped ${skipped} unmapped verse blocks`);
}

/**
 * The verse text here is assembled from individual word chunks, which is easy
 * to get subtly wrong — a dropped closing quote, a stray marker, an em-dash
 * spaced differently. The publisher also releases the same translation as plain
 * text, so every assembled verse is compared against it.
 */
async function readPublishedText(): Promise<Map<string, string>> {
  const raw = await readFile(path.join(SOURCE_DIR, "bsb.txt"), "utf8");
  const published = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const ref = line.slice(0, tab).trim();
    if (!/^[\w ]+ \d+:\d+$/.test(ref)) continue;
    published.set(ref, line.slice(tab + 1).replace(/\s+/g, " ").trim());
  }
  return published;
}

/**
 * Replaces the assembled text with the publisher's own plain-text edition.
 *
 * Text stitched together from word chunks is very nearly right, but the tables
 * omit some closing quotation marks, so a few thousand verses ended a
 * quotation without closing it. The publisher releases the same translation as
 * public-domain plain text, so that is used verbatim for anything a reader
 * reads, and the word chunks are aligned onto it at render time.
 */
async function applyPublishedText(db: DatabaseSync) {
  const published = await readPublishedText();
  const rows = db.prepare("SELECT id, ref, text FROM verses WHERE disputed IS NULL").all() as Array<{
    id: number;
    ref: string;
    text: string;
  }>;

  const update = db.prepare("UPDATE verses SET text = ? WHERE id = ?");
  const updateFts = db.prepare("UPDATE verses_fts SET text = ? WHERE rowid = ?");

  let replaced = 0;
  let identical = 0;
  let absent = 0;

  db.exec("BEGIN");
  for (const row of rows) {
    const official = published.get(row.ref);
    if (official === undefined) {
      absent += 1;
      continue;
    }
    if (official === row.text.replace(/\s+/g, " ").trim()) {
      identical += 1;
      continue;
    }
    update.run(official, row.id);
    updateFts.run(official, row.id);
    replaced += 1;
  }
  db.exec("COMMIT");

  log(
    `published text: ${identical.toLocaleString()} verses already matched, ${replaced.toLocaleString()} replaced`,
  );
  if (absent > 0) {
    throw new Error(`${absent} verses have no published text to fall back on`);
  }
}

/**
 * Each word chunk must be locatable, in order, within the published text —
 * otherwise the reading line would silently lose its hover targets.
 */
function verifyWordAlignment(db: DatabaseSync) {
  const rows = db.prepare("SELECT id, text FROM verses").all() as Array<{
    id: number;
    text: string;
  }>;
  const wordsFor = db.prepare(
    "SELECT english FROM words WHERE verse_id = ? ORDER BY pos",
  );

  let total = 0;
  let located = 0;
  const poor: number[] = [];

  for (const row of rows) {
    const words = wordsFor.all(row.id) as Array<{ english: string | null }>;
    let cursor = 0;
    let verseTotal = 0;
    let verseLocated = 0;
    for (const word of words) {
      const raw = word.english?.trim();
      if (!raw || isEnglishPlaceholder(raw)) continue;
      const needle = stripSuppliedMarkers(raw).trim();
      if (!needle) continue;
      verseTotal += 1;
      const found = row.text.indexOf(needle, cursor);
      if (found >= 0) {
        verseLocated += 1;
        cursor = found + needle.length;
      }
    }
    total += verseTotal;
    located += verseLocated;
    if (verseTotal > 0 && verseLocated / verseTotal < 0.5) poor.push(row.id);
  }

  const rate = total > 0 ? (100 * located) / total : 0;
  log(
    `word alignment: ${located.toLocaleString()}/${total.toLocaleString()} chunks located in the published text (${rate.toFixed(2)}%)`,
  );
  if (poor.length > 0) log(`  ${poor.length} verses aligned under half their chunks`);
  if (rate < 97) {
    throw new Error(`Only ${rate.toFixed(2)}% of word chunks align; hover coverage has regressed.`);
  }
}

/**
 * Restores the sixteen verses that carry a number but no running text.
 *
 * The Berean footnote on the preceding verse supplies the reading in the
 * publisher's own wording, and the amalgamated Greek NT supplies the words with
 * their Strong's numbers, so these verses behave like any other: hover, an
 * interlinear, and links through to each term. `verses.disputed` records which
 * traditions carry the verse, which the reader is shown.
 *
 * Parsing is borrowed from the same Greek form where it already appears
 * elsewhere in the corpus, rather than decoding a second morphology scheme and
 * risking a wrong description of the grammar.
 */
async function restoreDisputedVerses(db: DatabaseSync) {
  const wanted = new Set(DISPUTED_VERSES.map((verse) => verse.osis));
  const greekByRef = await readTagntVerses(
    SOURCE_DIR,
    ["tagnt_mat_jhn.txt", "tagnt_act_rev.txt"],
    wanted,
  );

  const previousFootnote = db.prepare("SELECT footnote FROM verses WHERE id = ?");
  const borrowParsing = db.prepare(
    `SELECT parsing, parsing_long FROM words
      WHERE strongs = ? AND original = ? COLLATE NOCASE AND parsing_long IS NOT NULL
      LIMIT 1`,
  );
  const insertVerse = db.prepare(
    `INSERT INTO verses (id, book_id, chapter, verse, ref, text, heading, crossref, footnote, disputed)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
  );
  const insertWord = db.prepare(
    `INSERT INTO words
       (verse_id, pos, src_pos, language, original, translit, parsing, parsing_long, strongs, english, prefix, suffix, para, editions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
  );
  const insertFts = db.prepare("INSERT INTO verses_fts (rowid, ref, text) VALUES (?, ?, ?)");

  let restored = 0;
  let wordCount = 0;
  let borrowed = 0;
  const missing: string[] = [];

  db.exec("BEGIN");
  for (const target of DISPUTED_VERSES) {
    const book = BOOKS_BY_NAME.get(target.bookName);
    const greek = greekByRef.get(target.osis) ?? [];
    const note = previousFootnote.get(target.index - 1) as { footnote: string | null } | undefined;
    const extracted = extractFootnoteVerse(note?.footnote ?? null, target.verse);

    if (!book || !extracted || greek.length === 0) {
      missing.push(target.osis);
      continue;
    }

    const ref = `${book.name} ${target.chapter}:${target.verse}`;
    const traditions = describeAttribution(extracted.attribution);
    const disputed = traditions
      ? `Absent from the earliest manuscripts; carried by ${traditions}.`
      : "Absent from the earliest manuscripts; carried by later ones.";

    insertVerse.run(
      target.index,
      book.id,
      target.chapter,
      target.verse,
      ref,
      extracted.text,
      disputed,
    );
    insertFts.run(target.index, ref, extracted.text);
    restored += 1;

    greek.forEach((word, position) => {
      const lent = word.strongs
        ? (borrowParsing.get(word.strongs, word.greek) as
            | { parsing: string | null; parsing_long: string | null }
            | undefined)
        : undefined;
      if (lent) borrowed += 1;

      insertWord.run(
        target.index,
        position,
        position,
        "Greek",
        word.greek,
        word.translit,
        lent?.parsing ?? word.code,
        lent?.parsing_long ?? null,
        word.strongs,
        word.gloss,
        word.editions,
      );
      wordCount += 1;
    });
  }
  db.exec("COMMIT");

  log(
    `disputed verses: restored ${restored}/${DISPUTED_VERSES.length} with ${wordCount} words (${borrowed} parsed from existing occurrences)`,
  );
  if (missing.length > 0) {
    throw new Error(`Could not restore ${missing.length} disputed verses: ${missing.join(", ")}`);
  }
}

function finalize(db: DatabaseSync) {
  log("computing occurrence counts and book totals …");
  db.exec(`
    UPDATE strongs
       SET occurrences = COALESCE(
         (SELECT COUNT(*) FROM words WHERE words.strongs = strongs.id), 0);

    UPDATE books
       SET chapters = COALESCE((SELECT MAX(chapter) FROM verses WHERE verses.book_id = books.id), 0),
           verses   = COALESCE((SELECT COUNT(*)     FROM verses WHERE verses.book_id = books.id), 0);
  `);

  const insertMeta = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
  insertMeta.run("translation", "Berean Study Bible");
  insertMeta.run("translation_short", "BSB");
  insertMeta.run("schema_version", "1");

  db.exec("PRAGMA journal_mode = DELETE");
  db.exec("VACUUM");
  db.exec("ANALYZE");
}

async function main() {
  await mkdir(path.join(ROOT, "data"), { recursive: true });
  await ensureSources();

  // Build into a scratch file and swap it in at the end. A dev server watching
  // the database then only ever sees a complete one, and cannot hold a lock on
  // the file being written.
  const building = `${DB_PATH}.building`;
  for (const stale of [building, `${building}-shm`, `${building}-wal`]) {
    if (await exists(stale)) await unlink(stale);
  }
  const db = new DatabaseSync(building);

  createSchema(db);
  importBooks(db);
  await importLexicons(db);
  await importDeepLexicons(db);
  await importCorpus(db);
  await applyPublishedText(db);
  verifyWordAlignment(db);
  await restoreDisputedVerses(db);
  finalize(db);
  db.close();

  const { rename } = await import("node:fs/promises");
  for (const stale of [DB_PATH, `${DB_PATH}-shm`, `${DB_PATH}-wal`]) {
    if (await exists(stale)) await unlink(stale);
  }
  await rename(building, DB_PATH);

  const { size } = await stat(DB_PATH);
  log(`done → data/bibleroot.db (${(size / 1e6).toFixed(1)} MB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
