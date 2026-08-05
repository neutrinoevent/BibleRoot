import { BOOKS, BOOKS_BY_ID, type BookMeta } from "./books";

/**
 * Deep links out to the standard scholarly tools. Every URL pattern here was
 * checked against all 66 books before being committed — the book codes differ
 * per site and cannot be derived reliably from the book name alone.
 */

/** Blue Letter Bible's three-letter codes, in canonical book order. */
const BLB_CODES = [
  "gen", "exo", "lev", "num", "deu", "jos", "jdg", "rut", "1sa", "2sa", "1ki", "2ki", "1ch",
  "2ch", "ezr", "neh", "est", "job", "psa", "pro", "ecc", "sng", "isa", "jer", "lam", "eze",
  "dan", "hos", "joe", "amo", "oba", "jon", "mic", "nah", "hab", "zep", "hag", "zec", "mal",
  "mat", "mar", "luk", "jhn", "act", "rom", "1co", "2co", "gal", "eph", "phi", "col", "1th",
  "2th", "1ti", "2ti", "tit", "phm", "heb", "jas", "1pe", "2pe", "1jo", "2jo", "3jo", "jde",
  "rev",
];

/** Both sites take the full book name; only these two differ from it. */
const BIBLEHUB_OVERRIDES: Record<string, string> = {
  Psalm: "psalms",
  "Song of Solomon": "songs",
};

const SEFARIA_OVERRIDES: Record<string, string> = {
  Psalm: "Psalms",
  "Song of Solomon": "Song_of_Songs",
};

export function bibleHubBook(book: BookMeta): string {
  return BIBLEHUB_OVERRIDES[book.name] ?? book.name.toLowerCase().replace(/ /g, "_");
}

export function blbBook(book: BookMeta): string {
  return BLB_CODES[book.id - 1] ?? book.slug;
}

export function sefariaBook(book: BookMeta): string {
  return SEFARIA_OVERRIDES[book.name] ?? book.name.replace(/ /g, "_");
}

/**
 * Wiktionary indexes Hebrew by its consonants, so the vowel points and
 * cantillation marks that BDB carries have to come off first.
 */
export function stripHebrewPoints(value: string): string {
  return value.replace(/[֑-ׇ]/g, "").trim();
}

export interface ResourceLink {
  label: string;
  description: string;
  url: string;
  /** Set for links contributed by the user's own resources file. */
  custom?: boolean;
}

export interface TermContext {
  strongs: string;
  number: number;
  language: "hebrew" | "greek";
  lemma: string | null;
  translit: string | null;
  twot: string | null;
}

export interface VerseContext {
  book: BookMeta;
  chapter: number;
  verse: number;
  ref: string;
}

export function termResources(term: TermContext): ResourceLink[] {
  const isGreek = term.language === "greek";
  const section = isGreek ? "greek" : "hebrew";
  const links: ResourceLink[] = [
    {
      label: "Bible Hub",
      description: "Every place this word appears, alongside its dictionary entry",
      url: `https://biblehub.com/${section}/${term.number}.htm`,
    },
    {
      label: "Englishman's Concordance",
      description: "Each verse it appears in, shown in the shape it takes there",
      url: `https://biblehub.com/${section}/strongs_${term.number}.htm`,
    },
    {
      label: "Blue Letter Bible",
      description: "Dictionary entry, how often it is used, and an interlinear to read alongside",
      url: `https://www.blueletterbible.org/lexicon/${term.strongs.toLowerCase()}/kjv/${
        isGreek ? "tr" : "wlc"
      }/0-1/`,
    },
    {
      label: "STEPBible",
      description: "A second dictionary, the grammar, and versions set side by side",
      url: `https://www.stepbible.org/?q=strong=${term.strongs}`,
    },
  ];

  if (isGreek && term.lemma) {
    links.push({
      label: "Logeion",
      description: "The great classical Greek dictionaries, showing how the word was used beyond the Bible",
      url: `https://logeion.uchicago.edu/${encodeURIComponent(term.lemma)}`,
    });
  }

  if (term.lemma) {
    const headword = isGreek ? term.lemma : stripHebrewPoints(term.lemma);
    if (headword) {
      links.push({
        label: "Wiktionary",
        description: "Where the word came from, its relatives, and how it was used since",
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(headword)}`,
      });
    }
  }

  return links;
}

export function verseResources(context: VerseContext): ResourceLink[] {
  const { book, chapter, verse } = context;
  const links: ResourceLink[] = [
    {
      label: "Bible Hub interlinear",
      description: "This verse word by word, with the original beneath each one",
      url: `https://biblehub.com/interlinear/${bibleHubBook(book)}/${chapter}-${verse}.htm`,
    },
    {
      label: "Bible Hub commentaries",
      description: "What Barnes, Gill, Keil–Delitzsch, the Pulpit commentary and others make of it",
      url: `https://biblehub.com/commentaries/${bibleHubBook(book)}/${chapter}-${verse}.htm`,
    },
    {
      label: "NET Bible notes",
      description: "Why the translators rendered it as they did, and what else it could mean",
      url: `https://netbible.org/bible/${encodeURIComponent(book.name)}+${chapter}:${verse}`,
    },
    {
      label: "STEPBible",
      description: "Versions side by side, with the grammar of each word",
      url: `https://www.stepbible.org/?q=reference=${book.osis}.${chapter}:${verse}`,
    },
    {
      label: "Blue Letter Bible",
      description: "Interlinear, concordance and commentary in one place",
      url: `https://www.blueletterbible.org/kjv/${blbBook(book)}/${chapter}/${verse}/`,
    },
    {
      label: "Bible Gateway",
      description: "How dozens of other translations render this verse",
      url: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(
        `${book.name} ${chapter}:${verse}`,
      )}`,
    },
  ];

  // Sefaria carries the Hebrew Bible with the Jewish commentary tradition —
  // Rashi, Ibn Ezra and the rest — so it only applies to the Old Testament.
  if (book.testament === "OT") {
    links.push({
      label: "Sefaria",
      description: "The Hebrew alongside Rashi, Ibn Ezra and the Jewish commentators",
      url: `https://www.sefaria.org/${sefariaBook(book)}.${chapter}.${verse}`,
    });
  }

  return links;
}

/* ------------------------------------------------------ user-defined links */

export interface CustomResource {
  label: string;
  description?: string;
  /**
   * Placeholders: {strongs} {number} {lemma} {translit} {twot} for terms;
   * {book} {bookSlug} {osis} {chapter} {verse} {ref} {bibleHub} {blb}
   * {sefaria} for verses.
   */
  url: string;
}

export interface CustomResourceFile {
  term?: CustomResource[];
  verse?: CustomResource[];
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? encodeURIComponent(values[key]) : whole,
  );
}

export function applyCustomTermResources(
  custom: CustomResource[] | undefined,
  term: TermContext,
): ResourceLink[] {
  if (!custom?.length) return [];
  const values = {
    strongs: term.strongs,
    number: String(term.number),
    lemma: term.lemma ?? "",
    translit: term.translit ?? "",
    twot: term.twot ?? "",
  };
  return custom.map((resource) => ({
    label: resource.label,
    description: resource.description ?? "",
    url: fill(resource.url, values),
    custom: true,
  }));
}

export function applyCustomVerseResources(
  custom: CustomResource[] | undefined,
  context: VerseContext,
): ResourceLink[] {
  if (!custom?.length) return [];
  const values = {
    book: context.book.name,
    bookSlug: context.book.slug,
    osis: context.book.osis,
    chapter: String(context.chapter),
    verse: String(context.verse),
    ref: context.ref,
    bibleHub: bibleHubBook(context.book),
    blb: blbBook(context.book),
    sefaria: sefariaBook(context.book),
  };
  return custom.map((resource) => ({
    label: resource.label,
    description: resource.description ?? "",
    url: fill(resource.url, values),
    custom: true,
  }));
}

/** Exported for the build-time link check. */
export const ALL_BOOKS_FOR_CHECK = BOOKS;
export { BOOKS_BY_ID };
