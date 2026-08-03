# BibleRoot

Read a verse, hover any word, and follow it back to the original language.

Open a verse and the English reads normally. Hover a word and you get the
Hebrew, Aramaic or Greek standing behind it — transliteration, grammatical form,
Strong's number, a short gloss. Click through for the full lexicon entry and
every other place in Scripture that same root is used. Save the terms that
matter to you, keep notes as you go, and all of it stays on your disk as plain
files.

Runs entirely locally. Nothing is sent anywhere.

## Setup

```bash
npm install
npm run build:data   # one-time, a few minutes
npm run dev          # http://localhost:3000
```

`build:data` downloads the public source data (~75 MB) into `data/sources/` and
compiles it into `data/bibleroot.db` (~97 MB): 31,086 verses, 443,626 aligned
words, 19,570 concise lexicon entries and 14,090 full scholarly ones. Both are
gitignored — rerun on a fresh clone. Rerunning is safe; already downloaded
sources are reused, and a running dev server picks up the new database on its
own.

## Using it

Type a **reference** — `Proverbs 20:22`, `prov 20.22`, `1 sam 3:4`, `Psalm 23` —
and you go straight there. Paste **verse text** and it searches. If you paste
from a different translation and no verse uses those exact words, it falls back
to ranking verses by the distinctive words they share, so "wait for the LORD,
and He will help you" still finds Proverbs 20:22.

On a verse page:

- **The reading line** — hover a word for the original behind it, click to keep
  the card open, `Esc` to dismiss. Words are keyboard-reachable too.
- **The interlinear** — every word in the order of the original text, Hebrew and
  Aramaic running right to left. Select any word to open its root.
- **Notes** — anchored to that verse.

On a term page: the concise entry, which books the root clusters in, and every
occurrence in Scripture shown in its verse — then, for going properly deep:

- **Scholarly lexicons**, in full, offline. Brown-Driver-Briggs for Hebrew and
  Aramaic, Abbott-Smith for Greek, with their sense hierarchies intact. Every
  scripture citation inside an entry is a link that opens here, and BDB's
  cross-references to other roots link to those terms.
- **Take it further** — deep links out to Bible Hub, the Englishman's
  Concordance, Blue Letter Bible, STEPBible, Logeion (LSJ and the classical
  Greek lexica) and Wiktionary, each addressed to this exact word.

Verse pages carry the same idea under **Study this verse elsewhere**: Bible Hub's
interlinear and commentaries, the NET Bible translators' notes, STEPBible, Blue
Letter Bible, Bible Gateway, and — for the Old Testament — Sefaria with the
Jewish commentary tradition.

### Adding your own sources

Drop a `data/resources.json` in place (copy `data/resources.example.json`) to add
destinations of your own:

```json
{
  "term":  [{ "label": "Perseus", "url": "https://www.perseus.tufts.edu/hopper/morph?l={lemma}&la=greek" }],
  "verse": [{ "label": "Parallel", "url": "https://biblehub.com/{bibleHub}/{chapter}-{verse}.htm" }]
}
```

Term links can use `{strongs} {number} {lemma} {translit} {twot}`; verse links can
use `{book} {bookSlug} {osis} {chapter} {verse} {ref} {bibleHub} {blb} {sefaria}`.
Values are URL-encoded on substitution, only `http(s)` URLs are accepted, and a
malformed file is ignored rather than breaking the page. Your links show up
marked *yours*.

## Your files

Saved terms and notes are markdown with a small frontmatter header, one file
each:

```
data/library/
  terms/H7451.md                          # a saved word, plus your notes on it
  notes/2026-08-03-proverbs-20-22.md      # a note, anchored to a verse or a term
```

```markdown
---
id: 2026-08-03-proverbs-20-22
title: Waiting instead of repaying
ref: Proverbs 20:22
created_at: 2026-08-03T17:01:23.216Z
updated_at: 2026-08-03T17:01:23.216Z
---

shalem (H7999) is "to make whole / repay" — the same root as shalom.
```

Grep them, edit them in any editor, sync them, commit them. The app reads
whatever is on disk.

## Where the data comes from

| Source | Used for | Licence |
| --- | --- | --- |
| [Berean Study Bible interlinear tables](https://bereanbible.com) | English text, word-by-word alignment to the original, Strong's numbers, morphology | Free to use |
| [Strong's dictionaries (Open Scriptures)](https://github.com/openscriptures/strongs) | Definitions, derivations, KJV renderings | CC BY-SA |
| [Tyndale House / STEPBible brief lexicons](https://github.com/STEPBible/STEPBible-Data) | Concise modern glosses, parts of speech | CC BY 4.0 |
| [Brown-Driver-Briggs (Open Scriptures)](https://github.com/openscriptures/HebrewLexicon) | Full Hebrew/Aramaic lexicon entries, plus TWOT numbers | Public domain (1906) |
| [Abbott-Smith (Translatable Exegetical Tools)](https://github.com/translatable-exegetical-tools/Abbott-Smith) | Full Greek lexicon entries | Public domain (1922) |

The importer deliberately skips the STEPBible "Meaning" column, which carries a
separate permission requirement from Online Bible.

Sixteen verse numbers — Matthew 17:21, 18:11, 23:14, Mark 7:16, 9:44, 9:46,
11:26, 15:28, Luke 17:36, 23:17, John 5:4, Acts 8:37, 15:34, 24:7, 28:29 and
Romans 16:24 — are absent from the manuscripts behind this text. Opening one
explains the gap rather than showing an empty verse.

## How it fits together

```
scripts/build-data.ts    streams the source tables into SQLite
scripts/deep-lexicons.ts BDB + Abbott-Smith XML → safe HTML, citations linked
src/lib/db.ts            read-only connection (node:sqlite, no native deps)
src/lib/corpus.ts        verse, word, lexicon and concordance queries
src/lib/render.ts        word rows → display pieces (shared server/client)
src/lib/library.ts       notes, saved terms and custom resources, on disk
src/lib/resources.ts     external deep-link patterns, per site and per book
src/lib/refs.ts          reference parsing and routing
```

The lexicon HTML is generated at import time from a fixed tag whitelist — every
text node escaped, no attribute copied through from the source — so pages render
it directly without a runtime sanitiser. The build asserts every entry is
well-formed before it lands in the database.

Next.js 16 App Router, React 19, Tailwind v4. The corpus is read through Node's
built-in `node:sqlite`, so there is no native module to compile.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build:data` | Download sources and build the corpus |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Docs

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — how it is built, the decisions behind it,
  and the data quirks that will bite you
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — future feature ideas, with the data
  availability for each already worked out
