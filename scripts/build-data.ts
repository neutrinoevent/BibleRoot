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

/** Placeholders the Berean tables use for words with no English of their own. */
const NO_ENGLISH = new Set(["-", "vvv", "...", "•"]);

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
      crossref TEXT
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
      para          TEXT
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
      occurrences   INTEGER NOT NULL DEFAULT 0
    );

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
 * `vvv` marks a source word whose English is carried by a neighbouring chunk.
 * It is usually the whole cell, but occasionally sits alongside real text.
 */
function cleanEnglish(value: string | null): string | null {
  const cleaned = cleanText(value);
  if (cleaned === null) return null;
  const withoutMarkers = cleaned.replace(/\bvvv\b/g, " ").replace(/\s+/g, " ").trim();
  return withoutMarkers || null;
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
    const visible = english.length > 0 && !NO_ENGLISH.has(english);
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

  return pieces
    .join(" ")
    .replace(/\s+/g, " ")
    // Opening marks hug the word that follows, closing marks the one before.
    // Spaced em-dashes are deliberately left alone.
    .replace(/([“‘([])\s+/g, "$1")
    .replace(/\s+([,.;:!?”’)\]])/g, "$1")
    .trim();
}

async function importCorpus(db: DatabaseSync) {
  const insertVerse = db.prepare(`
    INSERT INTO verses (id, book_id, chapter, verse, ref, text, heading, crossref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

    insertVerse.run(verseIndex, book.id, chapter, verse, ref, text, heading, crossref);
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
      }

      const refCell = cellText(values[COL.verseRef]);
      if (refCell) verseRef = refCell;

      const headingCell = cellText(values[COL.heading]);
      if (headingCell && !heading) {
        const plain = stripHtml(headingCell.replace(/\|/g, '"'));
        if (plain) heading = plain;
      }

      const crossrefCell = cellText(values[COL.crossref]);
      if (crossrefCell && !crossref) {
        const plain = stripHtml(crossrefCell.replace(/\|/g, '"'));
        if (plain) crossref = plain;
      }

      const original = cellText(values[COL.original])?.trim() || null;
      const rawEnglish = cellText(values[COL.english])?.trim() || null;
      if (!original && !rawEnglish) continue; // padding row
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
        prefix: stripMarkup(cellText(values[COL.beginQuote])),
        suffix: stripMarkup(
          `${cellText(values[COL.punctuation]) ?? ""}${cellText(values[COL.endQuote]) ?? ""}`,
        ),
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

  if (await exists(DB_PATH)) await unlink(DB_PATH);
  const db = new DatabaseSync(DB_PATH);

  createSchema(db);
  importBooks(db);
  await importLexicons(db);
  await importCorpus(db);
  finalize(db);
  db.close();

  const { size } = await stat(DB_PATH);
  log(`done → data/bibleroot.db (${(size / 1e6).toFixed(1)} MB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
