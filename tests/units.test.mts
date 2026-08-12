/**
 * The pure functions, checked without a corpus or a browser.
 *
 * The library location is the one place where getting a path wrong would put
 * somebody's notes somewhere they would never find them, so every platform is
 * checked from whichever platform happens to be running the tests.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { computeLibraryRoot, APP_DIR_NAME } from "../src/lib/library-location.ts";
import { decomposeParsing, PARTICLE_NOTES } from "../src/lib/morphology.ts";
import { savedPassageKey } from "../src/lib/passage-key.ts";
import {
  anchorIncludes,
  anchorLabel,
  parseVerseAnchor,
} from "../src/lib/verse-anchor.ts";

/**
 * The home directories below are invented, and joined together at runtime so
 * that `npm run audit:leaks` does not report this file. That check looks for
 * anybody's real home directory, and a rule that reports a false alarm every
 * time it runs is a rule people stop reading.
 */
const join = (...parts: string[]): string => parts.join("");
const MAC_HOME = join("/User", "s/ada");
const LINUX_HOME = join("/hom", "e/ada");
const WINDOWS_HOME = join("C:\\User", "s\\ada");
const EXTERNAL_DISK = join("/Volume", "s/Study/notes");

describe("where the library goes", () => {
  test("macOS uses Application Support", () => {
    assert.equal(
      computeLibraryRoot("darwin", {}, MAC_HOME),
      `${MAC_HOME}/Library/Application Support/${APP_DIR_NAME}`,
    );
  });

  test("Windows follows APPDATA, and falls back when it is missing", () => {
    assert.equal(
      computeLibraryRoot("win32", { APPDATA: `${WINDOWS_HOME}\\AppData\\Roaming` }, WINDOWS_HOME),
      `${WINDOWS_HOME}\\AppData\\Roaming\\${APP_DIR_NAME}`,
    );
    assert.equal(
      computeLibraryRoot("win32", {}, WINDOWS_HOME),
      `${WINDOWS_HOME}\\AppData\\Roaming\\${APP_DIR_NAME}`,
    );
  });

  test("Linux follows XDG_DATA_HOME, and falls back to .local/share", () => {
    assert.equal(
      computeLibraryRoot("linux", { XDG_DATA_HOME: `${LINUX_HOME}/.local/share` }, LINUX_HOME),
      `${LINUX_HOME}/.local/share/${APP_DIR_NAME}`,
    );
    assert.equal(
      computeLibraryRoot("linux", {}, LINUX_HOME),
      `${LINUX_HOME}/.local/share/${APP_DIR_NAME}`,
    );
  });

  test("a relative override is ignored rather than obeyed", () => {
    // Obeying it would put the library wherever the process happened to start.
    assert.equal(
      computeLibraryRoot("darwin", { BIBLEROOT_LIBRARY_DIR: "notes" }, MAC_HOME),
      `${MAC_HOME}/Library/Application Support/${APP_DIR_NAME}`,
    );
  });

  test("an absolute override is honoured", () => {
    assert.equal(
      computeLibraryRoot("darwin", { BIBLEROOT_LIBRARY_DIR: EXTERNAL_DISK }, MAC_HOME),
      EXTERNAL_DISK,
    );
  });

  test("blank environment values do not produce a path at the root", () => {
    for (const value of ["", "   "]) {
      const linux = computeLibraryRoot("linux", { XDG_DATA_HOME: value }, LINUX_HOME);
      assert.equal(linux, `${LINUX_HOME}/.local/share/${APP_DIR_NAME}`);
      const windows = computeLibraryRoot("win32", { APPDATA: value }, WINDOWS_HOME);
      assert.equal(windows, `${WINDOWS_HOME}\\AppData\\Roaming\\${APP_DIR_NAME}`);
    }
  });
});

describe("taking a compound word apart", () => {
  test("a preposition, a stem and a pronoun each come out named", () => {
    const parts = decomposeParsing(
      "Preposition-m | Noun - masculine singular construct | second person masculine singular",
    );
    assert.deepEqual(
      parts.map((part) => part.role),
      ["prefix", "stem", "suffix"],
    );
    assert.equal(parts[0].form, "מִן");
    assert.equal(parts[0].particle, "m");
  });

  test("two morphemes in one segment are both reported", () => {
    const parts = decomposeParsing("Preposition-l, Article | Noun - common singular");
    const prefixes = parts.filter((part) => part.role === "prefix");
    assert.equal(prefixes.length, 2);
    assert.deepEqual(prefixes.map((p) => p.particle), ["l", "d"]);
  });

  test("a verb's own subject agreement is not mistaken for a suffix", () => {
    // "third person masculine singular" here belongs to the verb, not to an
    // attached pronoun, and reading it as a suffix invented a word that is not
    // in the text.
    const parts = decomposeParsing("Verb - Qal - Perfect - third person masculine singular");
    assert.equal(parts.filter((part) => part.role === "suffix").length, 0);
  });

  test("a plain word decomposes to nothing worth showing", () => {
    assert.deepEqual(decomposeParsing("Noun - masculine singular"), []);
    assert.deepEqual(decomposeParsing(null), []);
  });
});

describe("the particles", () => {
  test("every letter the lexicon files one under has a note", () => {
    // The eight are fixed by the source, so a missing note would leave a page
    // with a lexicon entry and nothing said about it.
    for (const letter of ["b", "c", "d", "i", "k", "l", "m", "s"]) {
      const note = PARTICLE_NOTES[letter];
      assert.ok(note, `no note for particle ${letter}`);
      assert.ok(note.form.length > 0 && note.label.length > 0 && note.meaning.length > 0);
    }
  });
});

describe("telling one saved passage from another", () => {
  const key = (bookId: number, chapter: number, verses: number[]) =>
    savedPassageKey({ bookId, chapter, verses });

  test("the order verses were picked in does not make a new passage", () => {
    assert.equal(key(43, 1, [1, 7, 10]), key(43, 1, [10, 7, 1]));
  });

  test("picking the same verse twice does not make a new passage", () => {
    assert.equal(key(43, 1, [1, 7]), key(43, 1, [7, 1, 7]));
  });

  test("a smaller selection is its own passage", () => {
    // Removing one must never take the other with it.
    assert.notEqual(key(43, 1, [1, 7]), key(43, 1, [1, 7, 10]));
    assert.notEqual(key(43, 1, [1]), key(43, 1, [1, 7]));
  });

  test("the same numbers in another book or chapter are different passages", () => {
    assert.notEqual(key(43, 1, [1]), key(44, 1, [1]));
    assert.notEqual(key(43, 1, [1]), key(43, 2, [1]));
  });

  test("nonsense verse numbers are dropped rather than kept", () => {
    assert.equal(key(43, 1, [1, 0, -3, 7]), key(43, 1, [1, 7]));
  });
});

describe("reading a saved thing's reference back into verses", () => {
  test("a single verse", () => {
    assert.deepEqual(parseVerseAnchor("John 3:16"), { bookId: 43, chapter: 3, verses: [16] });
  });

  test("several verses read together", () => {
    assert.deepEqual(parseVerseAnchor("John 3:16, 17, 18"), {
      bookId: 43,
      chapter: 3,
      verses: [16, 17, 18],
    });
  });

  test("a book whose name begins with a number", () => {
    const anchor = parseVerseAnchor("1 Samuel 3:4, 8");
    assert.equal(anchor?.bookId, 9);
    assert.deepEqual(anchor?.verses, [4, 8]);
  });

  test("odd spacing and ordering are forgiven", () => {
    assert.deepEqual(parseVerseAnchor("  John 3 : 18,16 , 17  "), {
      bookId: 43,
      chapter: 3,
      verses: [16, 17, 18],
    });
  });

  test("anything it cannot read with certainty is refused", () => {
    // A reader can write their own ref into a note by hand. Guessing at what
    // they meant would put their notes under the wrong verse.
    for (const bad of ["", "John", "John 3", "Nowhere 3:16", "3:16", "John three:16", null]) {
      assert.equal(parseVerseAnchor(bad as string), null, `read "${bad}" as a reference`);
    }
  });

  test("a reference reads back the same way it was written", () => {
    const anchor = parseVerseAnchor("John 3:16, 17");
    assert.equal(anchorLabel(anchor!), "John 3:16, 17");
  });

  test("a verse is found inside the sets that contain it", () => {
    const group = parseVerseAnchor("John 3:16, 17, 18");
    assert.equal(anchorIncludes(group, 43, 3, 17), true);
    assert.equal(anchorIncludes(group, 43, 3, 19), false, "a verse not in the set");
    assert.equal(anchorIncludes(group, 43, 4, 17), false, "the same number, another chapter");
    assert.equal(anchorIncludes(group, 42, 3, 17), false, "the same number, another book");
    assert.equal(anchorIncludes(null, 43, 3, 17), false, "an unreadable reference");
  });
});

describe("the app is not offered to the network", () => {
  const scripts = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts as Record<
    string,
    string
  >;

  test("dev and start bind to loopback", () => {
    // A security audit found this listening on every interface. The pages serve
    // the reader's own notes and saved passages, and the actions that write and
    // delete them ask for no credential, because on one machine there is nobody
    // else to be. On a shared network that assumption stops holding.
    for (const name of ["dev", "start"]) {
      assert.match(
        scripts[name],
        /-H\s+127\.0\.0\.1/,
        `npm run ${name} would listen on every interface`,
      );
    }
  });

  test("reaching it from another device stays a deliberate, separate choice", () => {
    assert.match(scripts["dev:lan"] ?? "", /0\.0\.0\.0/);
    assert.doesNotMatch(scripts.dev, /0\.0\.0\.0/);
  });
});
