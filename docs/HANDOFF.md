# Handoff

Where BibleRoot stands, why it is built the way it is, and the things that will
bite someone picking it up cold. The README covers *using* the app; this covers
*working on* it.

Current as of `v2`.

## State

Two tagged releases, both on `main` at `neutrinoevent/BibleRoot` (private):

| Tag | What landed |
| --- | --- |
| `v1` | Interlinear reader, hover lookup, term pages with concordance, notes and saved terms on disk |
| `v2` | Brown-Driver-Briggs and Abbott-Smith rendered in full, external deep links, custom resources file |

Everything described in the README works and was exercised end to end in a real
browser. Nothing is half-finished or stubbed.

Stack: Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, Tailwind v4,
Node 25 with built-in `node:sqlite` — no native modules anywhere.

Corpus figures, for sanity-checking a rebuild:

```
31,086 verses          443,626 aligned words       19,570 concise lexicon entries
14,090 deep entries    13,848 / 13,876 roots covered by a deep entry
 8,019 deep entries containing in-app verse citations
data/bibleroot.db ≈ 97 MB, from ≈ 75 MB of downloaded sources
```

## Map

```
scripts/build-data.ts     downloads sources, builds the whole DB. The only build step.
scripts/deep-lexicons.ts  BDB + Abbott-Smith XML → HTML. SAX-driven, whitelist-only.
src/lib/db.ts             read-only connection, reopens when the file is replaced
src/lib/corpus.ts         all SQL. Server-only.
src/lib/render.ts         word rows → display pieces. Shared server/client — keep it clean.
src/lib/books.ts          the 66 books, canonical, with forgiving name matching
src/lib/refs.ts           "prov 20.22" → a route
src/lib/resources.ts      external link patterns + per-site book codes
src/lib/library.ts        notes, saved terms, custom resources — all on disk
src/components/           ReadingLine + WordPopover are the only client components
```

## Decisions worth knowing

**The corpus is a build artefact, not a checked-in file.** A fresh clone has no
database and every page shows a "run `npm run build:data`" notice. This is
deliberate: the upstream sources ask to be fetched from source rather than
redistributed, and 97 MB does not belong in git. If the app looks empty, check
whether the database exists before debugging anything else.

**Word-level alignment comes from the Berean interlinear tables**, which is the
reason the whole hover feature is possible at all. They give an explicit
English-phrase ↔ original-word mapping with Strong's numbers. Do not replace the
translation without a replacement alignment — the app has no way to align text
on its own.

**Lexicon HTML is generated, then trusted.** `deep-lexicons.ts` converts XML to
HTML through a closed tag whitelist: every text node is escaped, no attribute
from the source is ever copied through, and the only attributes emitted are
fixed class names and hrefs built from a validated book slug plus integers.
Pages therefore render it with `dangerouslySetInnerHTML` and no runtime
sanitiser. **If you touch that file, the whitelist must stay closed** — the
build's `assertWellFormed` check will catch unbalanced markup but it will not
catch you deciding to pass an attribute through.

**Elements emit open and close tags as a pair.** A citation becomes an `<a>`
when its reference resolves and a `<span>` when it does not, so the closing tag
travels with the opening one on a stack. An earlier version chose the closing
tag by tag name and produced mismatched HTML. Do not go back to that.

**User data is markdown on disk, not rows in the database.** The corpus is
disposable and rebuildable; notes are not. Keeping them as files means they
survive any schema change, and can be grepped and version-controlled.

**External book codes were validated, not guessed.** Bible Hub, Blue Letter
Bible and Sefaria each use different book identifiers. All 66 were checked
against the live sites before the tables in `resources.ts` were committed. If
you edit them, re-run that check rather than reasoning about the pattern.

## Gotchas

**Sixteen verses do not exist.** Matthew 17:21, 18:11, 23:14, Mark 7:16, 9:44,
9:46, 11:26, 15:28, Luke 17:36, 23:17, John 5:4, Acts 8:37, 15:34, 24:7, 28:29,
Romans 16:24 — absent from the manuscripts behind the BSB. `31,086 = 31,102 − 16`
is correct, not a bug. `isOmittedVerse` distinguishes these from a bad reference
so the page explains itself instead of 404ing.

**`-` and `vvv` in the English column are placeholders**, not text. `-` means the
original word is untranslated (articles, the direct object marker); `vvv` means
its English is carried by a neighbouring chunk. Both words still appear in the
interlinear — they just contribute no English. `buildDisplayPieces` folds their
punctuation onto the neighbouring chunk so nothing is dropped from the sentence.

**Punctuation and quote marks live on separate columns** from the English, and
opening marks arrive with trailing spaces. The spacing rules are applied in two
places — `buildVerseText` at import time for the stored text, and
`buildDisplayPieces` at render time for the reading line. Change one, change the
other, or the reading line and search results will disagree.

**Psalm superscriptions carry HTML** in the source — a `reftext` span holding the
verse number. It has to be removed *with its contents*, or a stray "1" ends up
mid-sentence.

**Note filenames can collide.** Two notes on the same verse on the same day
derive the same slug; `uniqueNoteId` suffixes `-2`, `-3`. This was a real
data-loss bug, found by writing two notes in a row. Keep the check.

**Rebuilding while `npm run dev` runs** used to 500 every page: the server held a
handle to the deleted inode. `getDb` now stats the file and reopens when it
changes. This is why there is a `stamp()` call on the hot path.

**Turbopack occasionally breaks on `node:` builtins during HMR** — editing
`db.ts` can produce `Failed to load external module node:sqlite: require is not
defined`. It is a dev-server artefact, not a code fault; restart `npm run dev`.
Production builds are unaffected.

## Verifying changes

Typecheck, lint and build all pass clean; keep them that way:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Beyond that, this project has been verified by driving a real browser rather
than by unit tests — the valuable behaviour is hover, navigation and files
landing on disk. Playwright was installed in a scratch directory, not as a
project dependency, so nothing here ships with a test harness. If you add one,
the flows worth covering are:

1. Hover a word on `/verse/proverbs/20/22` → popover shows רָ֑ע / H7451.
2. Save a term, write a note, then assert the markdown file exists on disk.
3. Two notes on the same verse → two files, neither overwritten.
4. Click a citation inside a lexicon entry → lands on that verse.
5. Fetch every `a[target="_blank"]` across a few pages and assert 200.

Check (5) after any change to `resources.ts`. 51/51 resolved at `v2`.

## Conventions

Commits carry no tooling attribution and no co-author trailers — plain messages
under the repo owner's identity. The `create-next-app` scaffold commit was
squashed away and its generated agent files removed for this reason.

## Known limitations

- One translation. There is no side-by-side comparison and no way to add another
  without a matching word alignment.
- Search is over the BSB text only, not over your own notes.
- Tags exist in note and term frontmatter but nothing browses them.
- The interlinear is verse-scoped; the chapter view is plain reading text.
- Textual variants (Qere/Ketiv, manuscript differences) are not imported, though
  the STEPBible TAHOT source carries them.
