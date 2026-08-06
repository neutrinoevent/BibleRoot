# Future features

Ideas for where BibleRoot goes next, ordered by what they would cost to build.
Nothing here is committed to. The figures were measured against the current
corpus and sources, so the question of whether the data exists is already
answered for each one.

## Where things stand

Shipped through `v18`. The reader, hover lookup and interlinear; scholarly
lexicons in full with their citations linked; external deep links; multi-verse
selection with shared-root tracing; all 31,102 verses including the disputed
sixteen; the Septuagint bridge between Greek and Hebrew; inflected forms as
pages of their own, opening in place before you commit to one; roots and forms
starred independently; and the library kept where each platform keeps an
application's files.

Recent work has been as much about arrangement as about data: the verses now sit
where a reader will meet them rather than below the outbound links, the
interface speaks to the reader instead of to whoever wrote it, and the headword
an outbound link will open at is named rather than assumed.

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

## Getting it to readers

Using BibleRoot means a terminal today: clone it, `npm install`, `npm run
build:data`, `npm run dev`. Almost everyone it was written for stops at the first
step. What follows is the shortest honest path from a talk in a church hall to
someone reading Proverbs 20:22 with the Hebrew underneath it.

### What the licences settle before any of it

The corpus cannot travel inside an installer. `NOTICE.md` records why: STEPBible
ask that people be sent to their repository rather than the files passed on, the
Strong's dictionaries carry a share-alike condition, and the Berean interlinear
terms ask to be read before anything is redistributed. Today each reader fetches
from source and nothing is handed on, and that posture is worth keeping.

So the installer carries the code, and the corpus is built the first time the app
opens: a progress screen where `npm run build:data` used to be, around 106 MB
fetched and a few minutes of work, once and never again.

The risk this accepts is that a source which moves or disappears breaks new
installations while existing ones carry on untouched. The public-domain
sources — the Berean text, Brown-Driver-Briggs, Abbott-Smith — could be mirrored
without conflicting with anything. The rest could not.

### Electron, and why the lighter option does not fit

Every route that matters is rendered on demand: `/read/[book]/[chapter]`,
`/term/[strongs]`, `/verse/…` and the form API. Only the 404 page is static, and
server components read SQLite directly, so a Node runtime has to be present while
the app runs.

Electron keeps all of that — `node:sqlite`, the server components, the notes as
markdown files on disk — for very little rewriting. Around 150–250 MB installed,
before the corpus.

Tauri would be a tenth of the size and does not fit. It carries no Node runtime,
so it would mean shipping a Node sidecar, which brings the size back and adds a
part that can fail, or moving the whole data layer to Rust.

**Settle one question before committing to any of this:** whether the Node inside
Electron exposes `node:sqlite`. If it does not, `better-sqlite3` does the same
job and `electron-builder` rebuilds it per platform, at the cost of the
native-module-free property the app has today. Half a day of work, and the answer
decides the estimate.

The shape: `output: 'standalone'` for a smaller server bundle; the main process
starts that server on an ephemeral port bound to `127.0.0.1` alone and loads it in
a window; first run shows the importer's progress. `electron-builder` produces
`.dmg`, `.exe` and `.AppImage`, and `electron-updater` reads GitHub Releases,
which the release tags already feed.

### Signing separates a demo from something a minister can open

macOS is covered: an Apple Developer account is already in hand, and signing plus
notarisation gives a double-click install with no warning screen.

Windows is the open question. An unsigned installer meets "Windows protected your
PC" from SmartScreen, which is where a non-technical reader stops. Azure Trusted
Signing is the cheapest current route at a few dollars a month for an individual,
though it asks for identity validation and a US or accepted-country business
presence. A traditional OV certificate runs one to four hundred a year and starts
with no reputation, so the warning persists until enough installs accumulate.
Certificates now require the key to live in hardware or a signing service, so the
old idea of a `.pfx` file on disk no longer applies.

Linux has no equivalent gate.

### The website that does the onboarding

A static page: what BibleRoot is, one screenshot of a hovered word, download
buttons for the three platforms, the licence, and a link to the source. No
tracking, nothing to sign up for. Any static host serves it, and Vercel deploys
straight from the repository if that is convenient.

The page carries the weight of the talk afterwards, so it should read as plainly
as the app does.

### No install at all

The furthest version of this idea: the reader opens a web page and the app is
simply there.

It is buildable. SQLite compiled to WebAssembly can read a database over HTTP
range requests, so a browser fetches the few pages a query touches rather than
109 MB. Static hosting is enough to serve it.

Two things stand in the way, and the first is not technical. **Hosting the built
corpus is the redistribution the licences ask about**, so this needs the Berean
terms read closely and probably a conversation with STEPBible, or a web corpus
assembled only from sources that permit it. Second, notes and saved words would
live in browser storage rather than as markdown files on disk, which gives up
something the app was deliberately built to have.

A reasonable resolution: the web version reads, and the desktop version keeps.
Someone tries it in a browser during the talk and installs it if they want their
own library. That also keeps the corpus question narrower, since a read-only
sampler needs less than the full apparatus.

---

## Deliberately out of scope

**Anything that phones home.** No analytics, no sync service, no account. The
app runs on your machine and your notes stay your files.

**A settings screen for the library path.** This was started and deliberately
pulled back out. A form that writes to a filesystem path of the visitor's
choosing needs traversal guards, symlink resolution, a denylist of system
directories and CSRF handling — a great deal of defending against a problem the
app can simply not have. The library goes where the platform keeps such files,
and `BIBLEROOT_LIBRARY_DIR` covers the rare case, set by whoever launches the
process and unreachable from a browser. Many of the people who will use this are
not technical; the safe default matters more than the choice.

**Commentary text in bulk.** Modern commentary is under copyright, and
public-domain commentary is better served elsewhere. The external links already
reach Bible Hub's collection.

**Guessing at alignment.** If a translation arrives without word-level
alignment, BibleRoot should not invent one. Fuzzy alignment would put the wrong
Hebrew word under an English one and give no sign it had done so.

---

## If picking one thing

There are two tracks here, and they answer different questions.

For the app itself, root and cognate trees. `LexicalIndex.xml` is already
downloaded and carries the etymological graph; a term page could then show the
other words built from the same root, which is usually what people mean by
studying a word family.

For reach, the Electron build. Every feature above is worth the same to a reader
who cannot open the app, and the first step is small: find out whether the Node
inside Electron exposes `node:sqlite`. The answer decides how much the rest
costs.
