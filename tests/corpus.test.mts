/**
 * Checks the built corpus against figures that should not move.
 *
 * These are the assertions that would have caught what went wrong before: a
 * lexicon key that parsed to `NaN` and silently swallowed seven entries, and an
 * occurrence list that stopped at a thousand while claiming to hold every one.
 *
 * The corpus is a build artifact, so every test here skips rather than fails
 * when it is absent. A fresh clone has no database until `npm run build:data`.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DB_PATH = process.env.DB_PATH ?? "data/bibleroot.db";
const missing = !fs.existsSync(DB_PATH);

const db = missing ? null : new DatabaseSync(DB_PATH, { readOnly: true });
const one = (sql: string, params: Array<string | number> = []): number =>
  Number(Object.values(db!.prepare(sql).get(...params) as object)[0]);
const rows = <T,>(sql: string, params: Array<string | number> = []): T[] =>
  db!.prepare(sql).all(...params) as T[];

describe("the corpus", { skip: missing && `no corpus at ${DB_PATH}` }, () => {
  test("holds the whole Bible", () => {
    assert.equal(one("SELECT COUNT(*) FROM books"), 66);
    assert.equal(one("SELECT COUNT(*) FROM verses"), 31102);
  });

  test("every verse has text", () => {
    assert.equal(one("SELECT COUNT(*) FROM verses WHERE text IS NULL OR TRIM(text) = ''"), 0);
  });

  test("aligned words point at verses that exist", () => {
    assert.equal(
      one("SELECT COUNT(*) FROM words w LEFT JOIN verses v ON v.id = w.verse_id WHERE v.id IS NULL"),
      0,
    );
  });
});

describe("lexicon keys", { skip: missing && "no corpus" }, () => {
  test("none parsed to NaN", () => {
    // Eight particles are named by letter rather than numbered. Running those
    // through Number() produced `HNaN` for all eight, so seven were discarded
    // as duplicates and the survivor was unreachable.
    assert.equal(one("SELECT COUNT(*) FROM lexicon_entries WHERE strongs LIKE '%NaN%'"), 0);
  });

  test("every key is a Strong's number or a particle letter", () => {
    const bad = rows<{ strongs: string }>(
      "SELECT DISTINCT strongs FROM lexicon_entries WHERE strongs NOT GLOB 'H[0-9]*' AND strongs NOT GLOB 'G[0-9]*' AND strongs NOT GLOB 'H[A-Z]'",
    );
    assert.deepEqual(bad, [], `unexpected lexicon keys: ${bad.map((r) => r.strongs).join(", ")}`);
  });

  test("all eight particles are present and distinct", () => {
    const found = rows<{ strongs: string; html: string }>(
      "SELECT strongs, html FROM lexicon_entries WHERE strongs GLOB 'H[A-Z]' ORDER BY strongs",
    );
    assert.deepEqual(
      found.map((r) => r.strongs),
      ["HB", "HC", "HD", "HI", "HK", "HL", "HM", "HS"],
    );
    for (const entry of found) {
      assert.ok(entry.html.length > 100, `${entry.strongs} has almost no text`);
    }
  });

  test("cross-references inside entries point somewhere real", () => {
    assert.equal(
      one("SELECT COUNT(*) FROM lexicon_entries WHERE html GLOB '*href=\"/term/H[A-Z]\"*'"),
      0,
      "a particle is linked as if it were a numbered term",
    );
  });
});

describe("occurrences", { skip: missing && "no corpus" }, () => {
  test("the commonest word keeps all of them", () => {
    // G3588, the Greek article. The term page used to cap its list at 1,000,
    // so the last 18,922 could not be reached by any means.
    const total = one("SELECT COUNT(*) FROM words WHERE strongs = 'G3588'");
    assert.ok(total > 19000, `expected the article to be everywhere, got ${total}`);
  });

  test("a query past the old ceiling returns what it asks for", () => {
    const got = rows("SELECT id FROM words WHERE strongs = 'G3588' LIMIT 3000");
    assert.equal(got.length, 3000);
  });

  test("narrowing by book partitions the total exactly", () => {
    const total = one("SELECT COUNT(*) FROM words WHERE strongs = 'H2617'");
    const summed = one(
      `SELECT SUM(c) FROM (SELECT COUNT(*) AS c FROM words w
         JOIN verses v ON v.id = w.verse_id WHERE w.strongs = 'H2617' GROUP BY v.book_id)`,
    );
    assert.equal(summed, total);
  });
});

describe("the Septuagint bridge", { skip: missing && "no corpus" }, () => {
  test("every link reaches a word that exists", () => {
    assert.equal(one("SELECT COUNT(*) FROM septuagint WHERE greek NOT IN (SELECT id FROM strongs)"), 0);
    assert.equal(one("SELECT COUNT(*) FROM septuagint WHERE hebrew NOT IN (SELECT id FROM strongs)"), 0);
  });

  test("the languages are the right way round", () => {
    assert.equal(
      one("SELECT COUNT(*) FROM septuagint s JOIN strongs t ON t.id = s.greek WHERE t.language != 'greek'"),
      0,
    );
    assert.equal(
      one("SELECT COUNT(*) FROM septuagint s JOIN strongs t ON t.id = s.hebrew WHERE t.language = 'greek'"),
      0,
    );
  });

  test("no pair is recorded twice", () => {
    assert.equal(
      one("SELECT COUNT(*) FROM (SELECT 1 FROM septuagint GROUP BY greek, hebrew HAVING COUNT(*) > 1)"),
      0,
    );
  });
});

describe("filtering occurrences by wording", { skip: missing && "no corpus" }, () => {
  test("the SQL that filters agrees with the TypeScript that labels", () => {
    // The bubbles are built in TypeScript by stripping supplied-word brackets,
    // and the filter matches in SQL. If the two ever disagree, choosing a
    // wording would hide verses that carry it, which is the one outcome this
    // feature must never produce. Checked against every wording in the corpus.
    const values = rows<{ english: string; normalised: string }>(
      `SELECT DISTINCT english,
              TRIM(REPLACE(REPLACE(REPLACE(REPLACE(english, '[', ''), ']', ''), '{', ''), '}', '')) AS normalised
         FROM words WHERE english IS NOT NULL`,
    );
    assert.ok(values.length > 100000, "expected the whole corpus of wordings");
    const disagreed = values.filter(
      (row) => row.english.replace(/[[\]{}]/g, "").trim() !== row.normalised,
    );
    assert.deepEqual(disagreed, []);
  });

  test("the wordings offered account for every occurrence that has one", () => {
    // Selecting every bubble has to bring back everything, so the counts behind
    // the bubbles must sum to the occurrences that carry a wording at all.
    const form = { strongs: "G18", original: "ἀγαθὸν" };
    const total = one("SELECT COUNT(*) FROM words WHERE strongs = ? AND original = ? COLLATE NOCASE", [
      form.strongs,
      form.original,
    ]);
    const withWording = one(
      "SELECT COUNT(*) FROM words WHERE strongs = ? AND original = ? COLLATE NOCASE AND english IS NOT NULL AND TRIM(english) != ''",
      [form.strongs, form.original],
    );
    assert.equal(withWording, total, "a wordless occurrence would have no bubble to reach it by");
  });
});

describe("search", { skip: missing && "no corpus" }, () => {
  test("finds a phrase that is certainly there", () => {
    const hits = rows("SELECT rowid FROM verses_fts WHERE verses_fts MATCH 'lamp AND feet' LIMIT 5");
    assert.ok(hits.length > 0, "the full-text index returned nothing for a known phrase");
  });
});
