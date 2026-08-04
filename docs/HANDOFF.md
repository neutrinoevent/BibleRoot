# Handoff

How BibleRoot is built and what tends to catch people out. The README covers
using the app; this covers working on it.

Current as of `v4`.

## State

Tagged releases on `main` at `neutrinoevent/BibleRoot`:

| Tag | What landed |
| --- | --- |
| `v1` | Interlinear reader, hover lookup, term pages with concordance, notes and saved terms on disk |
| `v2` | Brown-Driver-Briggs and Abbott-Smith rendered in full, external deep links, custom resources file |
| `v3` | Published text used for reading, multi-verse selection, MIT licence |
| `v4` | Inflected forms as first-class pages, with a grammatical glossary |

Everything in the README works and was exercised in a browser.

Stack: Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, Tailwind v4,
Node 25 with built-in `node:sqlite`. There are no native modules.

Corpus figures, for sanity-checking a rebuild:

```
31,086 verses          443,626 aligned words       19,570 concise lexicon entries
14,090 deep entries    13,848 / 13,876 roots covered by a deep entry
 8,019 deep entries containing in-app verse citations
99.93% of word chunks align to the published text
data/bibleroot.db ≈ 97 MB, from ≈ 79 MB of downloaded sources
```

## Map

```
scripts/build-data.ts     downloads sources, builds the whole DB. The only build step.
scripts/deep-lexicons.ts  BDB + Abbott-Smith XML → HTML. SAX-driven, whitelist-only.
src/lib/db.ts             read-only connection, reopens when the file is replaced
src/lib/corpus.ts         all SQL. Server-only.
src/lib/render.ts         word alignment and display helpers. Shared server/client.
src/lib/books.ts          the 66 books, with forgiving name matching
src/lib/refs.ts           "prov 20.22" → a route
src/lib/resources.ts      external link patterns and per-site book codes
src/lib/library.ts        notes, saved terms and custom resources, all on disk
src/components/           ReadingLine, WordPopover, ChapterVerses, NotesPanel are client-side
```

## Decisions

**The corpus is a build artefact.** A fresh clone has no database, and every
page shows a "run `npm run build:data`" notice until one exists. The upstream
sources ask to be fetched from source, and 97 MB does not belong in git. If the
app looks empty, check for the database before debugging anything else.

**The reading text is the publisher's own plain-text edition.** Text stitched
together from the interlinear tables matched the published Berean edition for
only 89.9% of verses. The gap is in the source: the `endQuote` column often
opens a quotation and never closes it. `applyPublishedText` overwrites the
assembled text with the published text for all 31,086 verses, and
`alignWordsToText` locates each word chunk inside it at render time. Characters
between chunks render as plain text without hover.

**Word alignment comes from the Berean interlinear tables.** They map each
English phrase to its original word with a Strong's number, which is what makes
hover possible. Adding a second translation would need its own alignment; the
app cannot derive one.

**Lexicon HTML is generated, then trusted.** `deep-lexicons.ts` converts XML
through a closed tag whitelist. Every text node is escaped, no source attribute
is copied through, and the only attributes emitted are fixed class names and
hrefs built from a validated book slug plus integers. Pages render it with
`dangerouslySetInnerHTML` and no runtime sanitiser. **If you touch that file,
keep the whitelist closed.** `assertWellFormed` catches unbalanced markup; it
will not catch you passing an attribute through.

**Elements emit their open and close tags as a pair.** A citation becomes an
`<a>` when its reference resolves and a `<span>` when it does not, so the
closing tag travels with the opening one on a stack. An earlier version chose
the closing tag by tag name and produced mismatched HTML.

**User data lives in markdown files.** The corpus is disposable and
rebuildable; notes are neither. Files survive schema changes and can be grepped
and version-controlled.

**External book codes were checked against the live sites.** Bible Hub, Blue
Letter Bible and Sefaria each use different identifiers. All 66 books were
verified before the tables in `resources.ts` were committed. Re-run that check
if you edit them.

## Gotchas

**Sixteen verses have no text.** Matthew 17:21, 18:11, 23:14, Mark 7:16, 9:44,
9:46, 11:26, 15:28, Luke 17:36, 23:17, John 5:4, Acts 8:37, 15:34, 24:7, 28:29
and Romans 16:24 are absent from the manuscripts behind the BSB, so
`31,086 = 31,102 − 16` is correct. `isOmittedVerse` tells these apart from a bad
reference, and the page explains the gap instead of returning a 404.

**`-`, `vvv` and `. . .` in the English column are markers.** `-` means the
original word is untranslated, such as an article or the direct object marker.
`vvv` and `. . .` mean its English is carried by a neighbouring chunk. All three
words still appear in the interlinear and contribute no English.

The dotted marker is spaced, `. . .` rather than `...`, which is how it got past
an earlier version of this filter and put stray ellipses into 12,543 verses.
`isEnglishPlaceholder` and `stripPlaceholderMarks` in `src/lib/render.ts` are
the single definition, imported by the importer as well as the UI. Genuine
ellipses do exist: Genesis 3:22, Exodus 32:32, Matthew 9:6, Mark 2:10, Mark
11:32 and Ephesians 3:1 trail off deliberately. Those arrive on the punctuation
column, which is why stripping only the English column is safe.

**Words link to the form, and the form links to the root.** Every word in the
text is inflected, while lexicons file entries under one headword: ἡμῶν, μου and
με are all ἐγώ (G1473, 18 forms); קַוֵּה is קָוָה (H6960, 45 forms). Sending a
reader straight to the headword reads as a broken link, so the primary
destination is the form.

- `/term/[strongs]/[form]` is the inflected form: its grammar explained, its own
  occurrences, its own English renderings, sibling forms, and a card linking up
  to the root. Hover cards, the interlinear and the forms list all point here.
- `/term/[strongs]` is the root: lexicon entries, the full concordance, book
  distribution, every form. Arriving with `?form=` makes it explain the relation.

Lexicon content is lemma-level by nature, so a form page links to it rather than
duplicating it. Saved terms and notes are also filed against the root, so they
aggregate across forms; the heading names which root.

Forms are merged case-insensitively in `getInflectedForms`, because a word
starting a sentence is capitalised and SQLite's `lower()` is ASCII-only, so
Ἐγὼ and ἐγὼ would otherwise appear as two forms.

`src/lib/morphology.ts` holds the grammatical glossary — what a Piel does, what
the genitive conveys. Terms are matched against the expanded parsing longest
first, with each matched span blanked out, so "Imperfect" is never also read as
"Perfect" and "Middle or Passive" is not split in two. Add terms there rather
than in a page.

**`[His]` and `{will}` are markup.** Both bracket forms mark words the
translators supplied for English sense. The published text prints them plainly,
so the reading line shows them in a lighter tone and the interlinear keeps the
brackets.

**Psalm superscriptions carry HTML** in the source: a `reftext` span holding the
verse number. It has to be removed with its contents, or a stray "1" lands
mid-sentence.

**Note filenames can collide.** Two notes on the same verse on the same day
derive the same slug, so `uniqueNoteId` suffixes `-2`, `-3`. This caused real
data loss before it was caught. Keep the check.

**The database is built into a scratch file and renamed into place.** Writing
it directly caused a `disk I/O error` when a dev server reopened it mid-build.
`getDb` stats the file and reopens when it changes, which is why there is a
`stamp()` call on the hot path.

**Turbopack sometimes breaks on `node:` builtins during HMR.** Editing `db.ts`
can produce `Failed to load external module node:sqlite: require is not
defined`. Restart `npm run dev`; production builds are unaffected.

## Verifying changes

Typecheck, lint and build all pass; keep them that way:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

`npm run build:data` fails the build if the word alignment drops below 97% or
any lexicon entry produces unbalanced markup.

Everything else has been verified by driving a browser. Playwright was
installed in a scratch directory, so the repo ships no test harness. If you add
one, cover:

1. Hover a word on `/verse/proverbs/20/22`; the popover shows רָ֑ע / H7451.
2. Save a term, write a note, then assert the markdown file exists on disk.
3. Two notes on the same verse produce two files, neither overwritten.
4. Click a citation inside a lexicon entry; it lands on that verse.
5. Fetch every `a[target="_blank"]` across a few pages and assert 200.

Run (5) after any change to `resources.ts`. 51/51 resolved at `v2`.
Also worth covering: select scattered verses in a chapter and open them together.

**Read the rendered output.** Both text bugs found so far, the stray ellipses
and the unclosed quotations, served HTTP 200 on every affected page and passed
every build. Comparing against the published plain text is what caught them.

## Conventions

Commits carry no tooling attribution and no co-author trailers. The
`create-next-app` scaffold commit was squashed away and its generated agent
files removed for the same reason.

## Known limitations

- One translation, with no side-by-side comparison. Adding another needs a
  matching word alignment.
- Search covers the BSB text only. Your own notes are not searchable.
- Tags exist in note and term frontmatter, but nothing browses them.
- The interlinear is verse-scoped; the chapter view is plain reading text.
- A multi-verse selection is confined to one chapter.
- Textual variants (Qere/Ketiv, manuscript differences) are not imported, though
  the STEPBible TAHOT source carries them.
- 281 word chunks out of 386,071 do not align to the published text and are not
  hoverable.
