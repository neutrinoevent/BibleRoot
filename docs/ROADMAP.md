# Future features

Ideas for where BibleRoot goes next, ordered by what it would cost to build.
Nothing here is committed to. Figures quoted were measured against the current
corpus and sources, so the "is the data there?" question is already answered for
each one.

---

## Ready now — the data is already in the database

No new import, no new source. These are query-and-render work.

### How this word actually gets translated

Group a root's occurrences by their English rendering and show the spread. H7451
is rendered **254 distinct ways** in the BSB — "this evil", "harm", "trouble",
"disaster", "wicked". Seeing that distribution is often the single most
illuminating thing about a word, and it is one `GROUP BY` over `words.english`.
Pairs naturally with the existing per-book distribution bars on the term page.

### Tag browsing

Note and term frontmatter already carries `tags`, and `library.ts` already parses
them. Nothing surfaces them. Add a tag index and `/library?tag=covenant`
filtering, plus tag entry in the note composer. Small, and it makes the library
useful past a few dozen entries.

### Search your own notes

Notes are markdown on disk and already loaded in full by `listNotes()`. Search
across them — and, better, search *both* corpus and notes from the one box,
returning "3 verses, 2 of your notes". The corpus already has FTS5; notes are
small enough to filter in memory.

### Backlinks

"Which of my notes touch this term or verse." `notesForRef` and `notesForStrongs`
already exist; verse and term pages already call them. What is missing is the
reverse view on the library side, and surfacing notes that mention a reference in
their *body* rather than their frontmatter.

### Chapter-level interlinear

The interlinear is verse-scoped; `/read/[book]/[chapter]` is plain reading text.
Same components, wider query.

### Study trail

A "recently studied" list — which verses and terms you have opened, in order.
Persisted as one append-only file under `data/library/`, in keeping with the rest.

---

## Needs a new import — the source is already downloaded or one fetch away

### Greek ↔ Hebrew through the Septuagint

The best idea on this list. Abbott-Smith entries record the Hebrew word each
Greek word renders in the LXX, **already tagged with a Strong's number**:

```xml
[in LXX for <foreign xml:lang="heb" n="H160">אַהֲבָה</foreign>, …]
```

There are **5,053 such tags across 3,320 entries, covering 2,349 distinct Hebrew
roots**. The importer currently drops the `n` attribute. Keeping it gives a
navigable bridge between the Testaments: from ἀγάπη straight to אַהֲבָה, and a
"rendered in the LXX by" list on the Hebrew side. Requires only a change in
`deep-lexicons.ts` plus a join table.

### Root and cognate trees

`LexicalIndex.xml` — already downloaded — carries an etymological graph:
**7,585 `etym` elements, 2,459 with an explicit root**, linking each word to its
root and its sibling derivations. This would let a term page show "words from
this root" — the thing people actually mean when they say they want to study a
word family. Currently only the Strong's ↔ BDB ↔ TWOT mapping is imported from
that file.

### Textual variants

The STEPBible TAHOT tables record Qere/Ketiv and manuscript variants per word,
with codes for Leningrad, Aleppo, BHS, Dead Sea and others. Not imported. Would
suit a quiet marker on affected words in the interlinear that expands to show
what the alternatives are and who follows them.

### A second translation

A public-domain translation (KJV or WEB) alongside the BSB for comparison.
Cheap to bundle as plain verse text; note that **hover would not work on it** —
the word-level alignment is specific to the Berean tables. Worth being explicit
about that in the UI rather than silently degrading.

### KJV-aligned Strong's

Would let the Englishman's-Concordance-style view work against a second text and
provide a cross-check on the alignment.

---

## Bigger bets

### Package it as a real app

`npm run dev` is a developer's affordance, not a reader's. Tauri or Electron
around the production build, with the corpus built on first launch, would make
this something you open rather than start. Worth doing before sharing it with
anyone non-technical.

### Word study export

Take a term, its lexicon entries, your notes and a chosen set of occurrences, and
emit a single markdown or PDF document. The obvious output for sermon or class
preparation, and it fits the on-disk philosophy — everything needed is already
files.

### Collocations

Which words habitually keep company with this root, computed across all 443,626
aligned words. Cheap to compute, genuinely revealing for words like *ḥesed* or
*ṣedeq*, but needs care in presentation to avoid implying more than the counts
support.

### Morphology-aware concordance

Filter a root's occurrences by parsed form — every Piel imperative of קוה,
every aorist participle of a Greek verb. `words.parsing` holds the codes already;
the work is a usable filter UI over a large and irregular code space.

### Audio

Pronunciation for Hebrew and Greek headwords. Needs a licensed or synthesised
source; there is no offline public-domain option, so this likely means an
external link rather than bundled audio.

---

## Deliberately not doing

**Anything that phones home.** No analytics, no sync service, no account. The
whole point is that it runs on your machine and your notes are your files.

**Commentary text in bulk.** Modern commentary is under copyright; public-domain
commentary is mostly available better elsewhere. The external links already reach
Bible Hub's collection, and that is the right division of labour.

**Guessing at alignment.** If a translation does not come with word-level
alignment, BibleRoot should not invent one. Fuzzy alignment would silently put
the wrong Hebrew word under an English one, which is worse than not offering it.

---

## If picking one thing

The **LXX bridge**. The data is already downloaded and tagged, the change is
contained to one file plus a join table, and it adds a dimension the app does not
currently have at all — the ability to walk from a Greek word in the New
Testament to the Hebrew it was chosen to render. Everything else on this list
deepens what BibleRoot already does; that one makes it a different tool.
