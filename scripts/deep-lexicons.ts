/**
 * Converts the two scholarly lexicons into renderable HTML, keyed by Strong's
 * number:
 *
 *   Brown-Driver-Briggs (Hebrew/Aramaic) — Open Scriptures' digitisation.
 *     Entries are addressed by BDB id, so LexicalIndex.xml supplies the
 *     Strong's ↔ BDB mapping (and TWOT numbers along the way).
 *   Abbott-Smith's Manual Greek Lexicon of the New Testament — the Strong's
 *     number is already part of each entry's `n` attribute.
 *
 * Both mark up scripture citations with OSIS references, which are resolved
 * here into in-app verse links.
 *
 * The HTML is generated entirely from the whitelists below — every text node is
 * escaped and no attribute from the source is ever copied through — so the
 * result is safe to render directly.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import sax from "sax";

import { findBook } from "../src/lib/books.ts";

export interface DeepEntry {
  strongs: string;
  source: "bdb" | "abbott-smith";
  headword: string | null;
  html: string;
  citation: string | null;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** "1Chr.8.5", "John.13.35-John.13.36" → an in-app href, or null. */
function osisToHref(raw: string | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(/[-–]/)[0].trim();
  const parts = first.split(".");
  if (parts.length < 3) return null;
  const book = findBook(parts[0]);
  const chapter = Number(parts[1]);
  const verse = Number.parseInt(parts[2], 10);
  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) return null;
  return `/verse/${book.slug}/${chapter}/${verse}`;
}

function scriptSpan(lang: string | undefined, fallback: "heb" | "grc"): string {
  const code = lang === "heb" || lang === "grc" ? lang : fallback;
  return code === "heb"
    ? '<span class="lex-heb" lang="he" dir="rtl">'
    : '<span class="lex-grk" lang="el">';
}

/**
 * An element either produces a matched open/close pair or nothing at all. The
 * closing tag travels with the opening one so a conditional element — a
 * citation that becomes a link only when its reference resolves — can never
 * emit mismatched HTML.
 */
interface Emission {
  open: string;
  close: string;
}

interface Handlers {
  /** Returns the pair to emit, or null to emit nothing for this element. */
  open(tag: string, attrs: Record<string, string>): Emission | null;
  /** Tags whose text content is dropped entirely. */
  silent: Set<string>;
}

/** Convenience for the common `<tag …>` / `</tag>` case. */
function pair(open: string, tagName: string): Emission {
  return { open, close: `</${tagName}>` };
}

interface ParseOptions {
  handlers: Handlers;
  /** Called when an entry element opens; return its key, or null to skip it. */
  entryKey(attrs: Record<string, string>): string | null;
  entryTag: string;
}

interface ParsedEntry {
  key: string;
  html: string;
  headword: string | null;
  note: string | null;
}

/**
 * Streams the document, buffering one entry at a time. `silentDepth` tracks
 * elements whose content is presentational noise (page numbers, editorial
 * status) so their text never reaches the output.
 */
function parseEntries(xml: string, options: ParseOptions): ParsedEntry[] {
  const parser = sax.parser(true, { trim: false, normalize: false });
  const entries: ParsedEntry[] = [];

  let buffer: string[] = [];
  let inEntry = false;
  let key: string | null = null;
  let silentDepth = 0;
  let headword: string | null = null;
  let capturingHeadword = false;
  let note: string | null = null;
  let capturingNote = false;
  // One slot per open element inside the entry, holding the closing tag it owes
  // (or null when the element emitted nothing).
  let openElements: Array<string | null> = [];

  parser.onopentag = (node) => {
    const attrs = node.attributes as Record<string, string>;
    const tag = node.name;

    if (tag === options.entryTag) {
      inEntry = true;
      key = options.entryKey(attrs);
      buffer = [];
      headword = null;
      note = null;
      silentDepth = 0;
      openElements = [];
      return;
    }
    if (!inEntry) return;

    if (silentDepth > 0) {
      silentDepth += 1;
      return;
    }
    if (options.handlers.silent.has(tag)) {
      silentDepth = 1;
      if (tag === "note" && attrs.type === "occurrencesNT") capturingNote = true;
      return;
    }

    // The first headword-bearing element gives the entry its display lemma.
    if (headword === null && (tag === "orth" || tag === "w") && !attrs.src) {
      capturingHeadword = true;
      headword = "";
    }

    const emission = options.handlers.open(tag, attrs);
    openElements.push(emission ? emission.close : null);
    if (emission) buffer.push(emission.open);
  };

  parser.ontext = (text) => {
    if (!inEntry) return;
    if (capturingNote) {
      note = (note ?? "") + text;
      return;
    }
    if (silentDepth > 0) return;
    if (capturingHeadword) headword = (headword ?? "") + text;
    buffer.push(escapeText(text));
  };

  parser.onclosetag = (tag) => {
    if (tag === options.entryTag) {
      if (inEntry && key) {
        entries.push({
          key,
          html: buffer.join("").replace(/\s+/g, " ").trim(),
          headword: headword?.trim() || null,
          note: note?.trim() || null,
        });
      }
      inEntry = false;
      key = null;
      return;
    }
    if (!inEntry) return;

    if (silentDepth > 0) {
      silentDepth -= 1;
      if (silentDepth === 0) capturingNote = false;
      return;
    }
    if (capturingHeadword && (tag === "orth" || tag === "w")) capturingHeadword = false;

    const close = openElements.pop();
    if (close) buffer.push(close);
  };

  parser.write(xml).close();
  return entries;
}

/* ------------------------------------------------------- Brown-Driver-Briggs */

/** LexicalIndex.xml: `<xref bdb="a.ae.ab" strong="1" twot="4a"/>` */
interface BdbLink {
  bdbId: string;
  twot: string | null;
}

function parseLexicalIndex(xml: string): Map<string, BdbLink> {
  const links = new Map<string, BdbLink>();
  const parser = sax.parser(true, {});
  parser.onopentag = (node) => {
    if (node.name !== "xref") return;
    const attrs = node.attributes as Record<string, string>;
    if (!attrs.strong || !attrs.bdb) return;
    const strongs = `H${Number(attrs.strong)}`;
    if (!links.has(strongs)) links.set(strongs, { bdbId: attrs.bdb, twot: attrs.twot ?? null });
  };
  parser.write(xml).close();
  return links;
}

function bdbHandlers(bdbToStrongs: Map<string, string>): Handlers {
  return {
    silent: new Set(["status", "page", "pb"]),
    open(tag, attrs) {
      switch (tag) {
        case "w": {
          // `<w src="a.ck.ax">` cross-references another BDB entry, and its text
          // is an internal id — link it by Strong's, or drop it entirely when
          // the target has no Strong's number.
          if (attrs.src) {
            const target = bdbToStrongs.get(attrs.src);
            return target
              ? pair(`<a class="lex-xref" href="/term/${target}">`, "a")
              : { open: "<span hidden>", close: "</span>" };
          }
          return pair('<span class="lex-heb" lang="he" dir="rtl">', "span");
        }
        case "foreign":
          return pair(scriptSpan(attrs["xml:lang"], "heb"), "span");
        case "def":
          return pair('<em class="lex-gloss">', "em");
        case "pos":
          return pair('<span class="lex-pos">', "span");
        case "stem":
        case "asp":
          return pair('<span class="lex-tag">', "span");
        case "em":
          return pair("<i>", "i");
        case "sense":
          return pair(
            `<div class="lex-sense">${
              attrs.n ? `<span class="lex-sense-n">${escapeText(attrs.n)}</span> ` : ""
            }`,
            "div",
          );
        case "ref": {
          const href = osisToHref(attrs.r);
          return href
            ? pair(`<a class="lex-ref" href="${href}">`, "a")
            : pair('<span class="lex-cite">', "span");
        }
        default:
          return null;
      }
    },
  };
}

/* ------------------------------------------------------------- Abbott-Smith */

function abbottSmithHandlers(): Handlers {
  return {
    silent: new Set(["note", "pb"]),
    open(tag, attrs) {
      switch (tag) {
        case "orth":
          return pair('<b class="lex-grk" lang="el">', "b");
        case "foreign":
          return pair(scriptSpan(attrs["xml:lang"], "grc"), "span");
        case "gloss":
          return pair('<em class="lex-gloss">', "em");
        case "pos":
        case "tns":
          return pair('<span class="lex-pos">', "span");
        case "emph":
        case "hi":
          return pair("<i>", "i");
        case "form":
          return pair('<div class="lex-form">', "div");
        case "etym":
        case "re":
        case "seg":
        case "p":
          return pair('<div class="lex-block">', "div");
        case "sense":
          return pair(
            `<div class="lex-sense">${
              attrs.n ? `<span class="lex-sense-n">${escapeText(attrs.n)}</span> ` : ""
            }`,
            "div",
          );
        case "ref": {
          const href = osisToHref(attrs.osisRef);
          return href
            ? pair(`<a class="lex-ref" href="${href}">`, "a")
            : pair('<span class="lex-cite">', "span");
        }
        default:
          return null;
      }
    },
  };
}

/* -------------------------------------------------------------------- entry */

export async function buildDeepLexicons(
  sourceDir: string,
): Promise<{ entries: DeepEntry[]; twot: Map<string, string> }> {
  const entries: DeepEntry[] = [];

  // --- Hebrew: BDB, reached through the lexical index ---
  const indexXml = await readFile(path.join(sourceDir, "LexicalIndex.xml"), "utf8");
  const links = parseLexicalIndex(indexXml);

  const bdbToStrongs = new Map<string, string>();
  const twot = new Map<string, string>();
  for (const [strongs, link] of links) {
    if (!bdbToStrongs.has(link.bdbId)) bdbToStrongs.set(link.bdbId, strongs);
    if (link.twot) twot.set(strongs, link.twot);
  }

  const bdbXml = await readFile(path.join(sourceDir, "BrownDriverBriggs.xml"), "utf8");
  const bdbEntries = new Map<string, ParsedEntry>();
  for (const entry of parseEntries(bdbXml, {
    entryTag: "entry",
    entryKey: (attrs) => attrs.id ?? null,
    handlers: bdbHandlers(bdbToStrongs),
  })) {
    bdbEntries.set(entry.key, entry);
  }

  for (const [strongs, link] of links) {
    const entry = bdbEntries.get(link.bdbId);
    if (!entry || !entry.html) continue;
    entries.push({
      strongs,
      source: "bdb",
      headword: entry.headword,
      html: entry.html,
      citation: link.twot ? `TWOT ${link.twot}` : null,
    });
  }

  // --- Greek: Abbott-Smith, keyed by Strong's already ---
  const asXml = await readFile(path.join(sourceDir, "abbott-smith.tei.xml"), "utf8");
  const seen = new Set<string>();
  for (const entry of parseEntries(asXml, {
    entryTag: "entry",
    // `n="ἀγάπη|G26"`
    entryKey: (attrs) => {
      const parts = (attrs.n ?? "").split("|");
      if (parts.length < 2) return null;
      const match = /^G0*(\d+)$/.exec(parts[1].trim());
      return match ? `G${Number(match[1])}` : null;
    },
    handlers: abbottSmithHandlers(),
  })) {
    if (!entry.html || seen.has(entry.key)) continue;
    seen.add(entry.key);
    entries.push({
      strongs: entry.key,
      source: "abbott-smith",
      headword: entry.headword,
      citation: entry.note ? `${entry.note}× in the New Testament` : null,
      html: entry.html,
    });
  }

  return { entries, twot };
}
