# Notice

**The MIT licence in `LICENSE` covers the BibleRoot application code and
documentation only.** It does not cover the biblical text, the lexicons, or the
word alignment data. Those are the work of others, carry their own terms, and
are not the present author's to relicense.

None of that data lives in this repository. `npm run build:data` downloads it
from the sources below and compiles it into a local database, both of which are
gitignored. If you redistribute a built database, or anything derived from it,
the terms below travel with it — not the MIT licence.

## Data sources

| Source | Used for | Terms |
| --- | --- | --- |
| [Berean Study Bible](https://bereanbible.com) and its interlinear tables | English text; the word-level alignment between English and the original languages; Strong's numbers; morphology | Free to use, per the publisher's stated terms. Please read them before redistributing. |
| [Strong's Hebrew and Greek dictionaries](https://github.com/openscriptures/strongs), digitised by Open Scriptures | Definitions, derivations, KJV renderings | CC BY-SA. **Share-alike**: derivatives of this data must carry the same licence. |
| [Tyndale House / STEPBible brief lexicons](https://github.com/STEPBible/STEPBible-Data) | Concise glosses, parts of speech | CC BY 4.0. STEPBible asks that others be referred to github.com/STEPBible as the source rather than redistributing the files. |
| [Brown-Driver-Briggs](https://github.com/openscriptures/HebrewLexicon), digitised by Open Scriptures | Full Hebrew and Aramaic lexicon entries; TWOT numbers | The 1906 text is public domain. |
| [Abbott-Smith](https://github.com/translatable-exegetical-tools/Abbott-Smith), digitised by Translatable Exegetical Tools | Full Greek lexicon entries | The 1922 text is public domain. |

The importer deliberately omits the STEPBible lexicons' "Meaning" column, which
derives from the Abridged BDB and carries a separate permission requirement from
Online Bible.

## If you fork this

The code is yours to use, change and sell under the MIT licence. The data is
not: fetch it from the sources above as this project does, keep the attributions
above intact, and honour the share-alike condition on the Strong's dictionaries
if you publish anything derived from them.
