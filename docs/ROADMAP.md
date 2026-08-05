# Future features

Ideas for where BibleRoot goes next, ordered by what they would cost to build.
Nothing here is committed to. The figures were measured against the current
corpus and sources, so the question of whether the data exists is already
answered for each one.

## Where things stand

Shipped through `v7`: the reader and hover lookup, scholarly lexicons, external
deep links, multi-verse selection with shared-root tracing, inflected forms as
first-class pages, and all 31,102 verses including the disputed sixteen.

Form pages now carry their own weight: the compound word broken into its parts,
the transliteration, the grammar explained, renderings, sibling forms, a book
distribution and the full concordance for that exact form, with the root's
definition on the card that leads up to it.

---

---

## Ready now — the data is already in the database

Query-and-render work. No new import, no new source.

### Tag browsing

Note and term frontmatter already carries `tags`, and `library.ts` already
parses them. Nothing surfaces them yet. Add a tag index, `/library?tag=covenant`
filtering, and tag entry in the note composer. This is what makes the library
usable past a few dozen entries.

### Search your own notes

Notes are markdown on disk and `listNotes()` already loads them in full. Search
across them, and ideally search both corpus and notes from the one box, so a
query returns "3 verses, 2 of your notes". The corpus already has FTS5; notes
are small enough to filter in memory.

### Backlinks

Which of your notes touch this term or verse. `notesForRef` and
`notesForStrongs` exist and the verse and term pages already call them. What is
missing is the reverse view in the library, and picking up notes that mention a
reference in their body rather than their frontmatter.

### Chapter-level interlinear

The interlinear is verse-scoped and `/read/[book]/[chapter]` is plain reading
text. Same components, wider query. Multi-verse selection already covers the
scattered case; this is the contiguous one.

### Study trail

A list of the verses and terms you have opened, in order. One append-only file
in the library folder, in keeping with the rest.

---

## Needs a new import — the source is downloaded or one fetch away

### Greek and Hebrew through the Septuagint

Abbott-Smith entries record the Hebrew word each Greek word renders in the LXX,
already tagged with a Strong's number:

```xml
[in LXX for <foreign xml:lang="heb" n="H160">אַהֲבָה</foreign>, …]
```

There are 5,053 such tags across 3,320 entries, covering 2,349 distinct Hebrew
roots. The importer currently drops the `n` attribute. Keeping it gives a
navigable bridge between the Testaments: ἀγάπη through to אַהֲבָה, and a
"rendered in the LXX by" list on the Hebrew side. It needs a change in
`deep-lexicons.ts` and a join table.

### Root and cognate trees

`LexicalIndex.xml`, already downloaded, carries an etymological graph: 7,585
`etym` elements, 2,459 with an explicit root, linking each word to its root and
its sibling derivations. A term page could then show the other words built from
the same root, which is usually what people mean by studying a word family. Only
the Strong's ↔ BDB ↔ TWOT mapping is imported from that file today.

### Textual variants

The STEPBible TAHOT tables record Qere/Ketiv and manuscript variants per word,
coded for Leningrad, Aleppo, BHS, the Dead Sea scrolls and others. A quiet
marker on affected words in the interlinear could expand to show the
alternatives and who follows them.

### A second translation

A public-domain translation such as the KJV or WEB alongside the BSB. Cheap to
bundle as plain verse text. Hover would not work on it, since the word alignment
is specific to the Berean tables, and the UI should say so plainly rather than
degrade quietly.

---

## Bigger bets

### Package it as an application

`npm run dev` suits a developer. Tauri or Electron around the production build,
with the corpus built on first launch, would make this something you open. Worth
doing before sharing it with anyone non-technical.

### Word study export

Take a term, its lexicon entries, your notes and a chosen set of occurrences,
and emit one markdown or PDF document. The obvious output for sermon or class
preparation, and everything it needs is already files.

### Collocations

Which words habitually keep company with a root, computed across all 443,626
aligned words. Cheap to compute and revealing for words like *ḥesed* or *ṣedeq*.
Presentation needs care so the counts are not read as more than they are.

### Morphology-aware concordance

Filter a root's occurrences by parsed form: every Piel imperative of קוה, every
aorist participle of a Greek verb. `words.parsing` already holds the codes. The
work is a usable filter over a large and irregular code space.

### Audio

Pronunciation for Hebrew and Greek headwords. There is no offline public-domain
source, so this probably means an external link rather than bundled audio.

---

## Deliberately out of scope

**Anything that phones home.** No analytics, no sync service, no account. The
app runs on your machine and your notes stay your files.

**Commentary text in bulk.** Modern commentary is under copyright, and
public-domain commentary is better served elsewhere. The external links already
reach Bible Hub's collection.

**Guessing at alignment.** If a translation arrives without word-level
alignment, BibleRoot should not invent one. Fuzzy alignment would put the wrong
Hebrew word under an English one and give no sign it had done so.

---

## If picking one thing

The Septuagint bridge. The data is downloaded and tagged, the change is
contained to one file and a join table, and it adds a dimension the app does not
have today: walking from a Greek word in the New Testament to the Hebrew it was
chosen to render.
