/**
 * Canonical book metadata.
 *
 * `name` matches the book names used by the Berean interlinear tables exactly,
 * so the importer can map a parsed "Proverbs 20:22" reference straight onto a
 * row. `aliases` exist purely to make user input forgiving.
 */

export type Testament = "OT" | "NT";

export interface BookMeta {
  id: number;
  name: string;
  slug: string;
  osis: string;
  testament: Testament;
  aliases: string[];
}

export const BOOKS: BookMeta[] = [
  { id: 1, name: "Genesis", slug: "genesis", osis: "Gen", testament: "OT", aliases: ["gen", "ge", "gn"] },
  { id: 2, name: "Exodus", slug: "exodus", osis: "Exod", testament: "OT", aliases: ["exo", "ex", "exod"] },
  { id: 3, name: "Leviticus", slug: "leviticus", osis: "Lev", testament: "OT", aliases: ["lev", "lv"] },
  { id: 4, name: "Numbers", slug: "numbers", osis: "Num", testament: "OT", aliases: ["num", "nm", "nu"] },
  { id: 5, name: "Deuteronomy", slug: "deuteronomy", osis: "Deut", testament: "OT", aliases: ["deut", "deu", "dt"] },
  { id: 6, name: "Joshua", slug: "joshua", osis: "Josh", testament: "OT", aliases: ["josh", "jos"] },
  { id: 7, name: "Judges", slug: "judges", osis: "Judg", testament: "OT", aliases: ["judg", "jdg", "jg"] },
  { id: 8, name: "Ruth", slug: "ruth", osis: "Ruth", testament: "OT", aliases: ["rut", "ru"] },
  { id: 9, name: "1 Samuel", slug: "1-samuel", osis: "1Sam", testament: "OT", aliases: ["1sam", "1sa", "isam", "first samuel"] },
  { id: 10, name: "2 Samuel", slug: "2-samuel", osis: "2Sam", testament: "OT", aliases: ["2sam", "2sa", "iisam", "second samuel"] },
  { id: 11, name: "1 Kings", slug: "1-kings", osis: "1Kgs", testament: "OT", aliases: ["1kgs", "1ki", "ikings", "first kings"] },
  { id: 12, name: "2 Kings", slug: "2-kings", osis: "2Kgs", testament: "OT", aliases: ["2kgs", "2ki", "iikings", "second kings"] },
  { id: 13, name: "1 Chronicles", slug: "1-chronicles", osis: "1Chr", testament: "OT", aliases: ["1chr", "1ch", "first chronicles"] },
  { id: 14, name: "2 Chronicles", slug: "2-chronicles", osis: "2Chr", testament: "OT", aliases: ["2chr", "2ch", "second chronicles"] },
  { id: 15, name: "Ezra", slug: "ezra", osis: "Ezra", testament: "OT", aliases: ["ezr"] },
  { id: 16, name: "Nehemiah", slug: "nehemiah", osis: "Neh", testament: "OT", aliases: ["neh", "ne"] },
  { id: 17, name: "Esther", slug: "esther", osis: "Esth", testament: "OT", aliases: ["esth", "est"] },
  { id: 18, name: "Job", slug: "job", osis: "Job", testament: "OT", aliases: ["jb"] },
  { id: 19, name: "Psalm", slug: "psalms", osis: "Ps", testament: "OT", aliases: ["psalms", "psa", "ps", "psm", "pslm"] },
  { id: 20, name: "Proverbs", slug: "proverbs", osis: "Prov", testament: "OT", aliases: ["prov", "pro", "prv", "pr"] },
  { id: 21, name: "Ecclesiastes", slug: "ecclesiastes", osis: "Eccl", testament: "OT", aliases: ["eccl", "ecc", "ec", "qoheleth"] },
  { id: 22, name: "Song of Solomon", slug: "song-of-solomon", osis: "Song", testament: "OT", aliases: ["song of songs", "song", "sos", "sng", "canticles"] },
  { id: 23, name: "Isaiah", slug: "isaiah", osis: "Isa", testament: "OT", aliases: ["isa", "is"] },
  { id: 24, name: "Jeremiah", slug: "jeremiah", osis: "Jer", testament: "OT", aliases: ["jer", "je"] },
  { id: 25, name: "Lamentations", slug: "lamentations", osis: "Lam", testament: "OT", aliases: ["lam", "la"] },
  { id: 26, name: "Ezekiel", slug: "ezekiel", osis: "Ezek", testament: "OT", aliases: ["ezek", "eze", "ezk"] },
  { id: 27, name: "Daniel", slug: "daniel", osis: "Dan", testament: "OT", aliases: ["dan", "dn"] },
  { id: 28, name: "Hosea", slug: "hosea", osis: "Hos", testament: "OT", aliases: ["hos", "ho"] },
  { id: 29, name: "Joel", slug: "joel", osis: "Joel", testament: "OT", aliases: ["joe", "jl"] },
  { id: 30, name: "Amos", slug: "amos", osis: "Amos", testament: "OT", aliases: ["amo", "am"] },
  { id: 31, name: "Obadiah", slug: "obadiah", osis: "Obad", testament: "OT", aliases: ["obad", "oba", "ob"] },
  { id: 32, name: "Jonah", slug: "jonah", osis: "Jonah", testament: "OT", aliases: ["jon", "jnh"] },
  { id: 33, name: "Micah", slug: "micah", osis: "Mic", testament: "OT", aliases: ["mic", "mc"] },
  { id: 34, name: "Nahum", slug: "nahum", osis: "Nah", testament: "OT", aliases: ["nah", "na"] },
  { id: 35, name: "Habakkuk", slug: "habakkuk", osis: "Hab", testament: "OT", aliases: ["hab", "hb"] },
  { id: 36, name: "Zephaniah", slug: "zephaniah", osis: "Zeph", testament: "OT", aliases: ["zeph", "zep", "zp"] },
  { id: 37, name: "Haggai", slug: "haggai", osis: "Hag", testament: "OT", aliases: ["hag", "hg"] },
  { id: 38, name: "Zechariah", slug: "zechariah", osis: "Zech", testament: "OT", aliases: ["zech", "zec", "zc"] },
  { id: 39, name: "Malachi", slug: "malachi", osis: "Mal", testament: "OT", aliases: ["mal", "ml"] },
  { id: 40, name: "Matthew", slug: "matthew", osis: "Matt", testament: "NT", aliases: ["matt", "mat", "mt"] },
  { id: 41, name: "Mark", slug: "mark", osis: "Mark", testament: "NT", aliases: ["mrk", "mk", "mr"] },
  { id: 42, name: "Luke", slug: "luke", osis: "Luke", testament: "NT", aliases: ["luk", "lk"] },
  { id: 43, name: "John", slug: "john", osis: "John", testament: "NT", aliases: ["jhn", "jn"] },
  { id: 44, name: "Acts", slug: "acts", osis: "Acts", testament: "NT", aliases: ["act", "ac"] },
  { id: 45, name: "Romans", slug: "romans", osis: "Rom", testament: "NT", aliases: ["rom", "ro", "rm"] },
  { id: 46, name: "1 Corinthians", slug: "1-corinthians", osis: "1Cor", testament: "NT", aliases: ["1cor", "1co", "first corinthians"] },
  { id: 47, name: "2 Corinthians", slug: "2-corinthians", osis: "2Cor", testament: "NT", aliases: ["2cor", "2co", "second corinthians"] },
  { id: 48, name: "Galatians", slug: "galatians", osis: "Gal", testament: "NT", aliases: ["gal", "ga"] },
  { id: 49, name: "Ephesians", slug: "ephesians", osis: "Eph", testament: "NT", aliases: ["eph", "ep"] },
  { id: 50, name: "Philippians", slug: "philippians", osis: "Phil", testament: "NT", aliases: ["phil", "php", "pp"] },
  { id: 51, name: "Colossians", slug: "colossians", osis: "Col", testament: "NT", aliases: ["col", "cl"] },
  { id: 52, name: "1 Thessalonians", slug: "1-thessalonians", osis: "1Thess", testament: "NT", aliases: ["1thess", "1th", "first thessalonians"] },
  { id: 53, name: "2 Thessalonians", slug: "2-thessalonians", osis: "2Thess", testament: "NT", aliases: ["2thess", "2th", "second thessalonians"] },
  { id: 54, name: "1 Timothy", slug: "1-timothy", osis: "1Tim", testament: "NT", aliases: ["1tim", "1ti", "first timothy"] },
  { id: 55, name: "2 Timothy", slug: "2-timothy", osis: "2Tim", testament: "NT", aliases: ["2tim", "2ti", "second timothy"] },
  { id: 56, name: "Titus", slug: "titus", osis: "Titus", testament: "NT", aliases: ["tit", "ti"] },
  { id: 57, name: "Philemon", slug: "philemon", osis: "Phlm", testament: "NT", aliases: ["phlm", "phm", "pm"] },
  { id: 58, name: "Hebrews", slug: "hebrews", osis: "Heb", testament: "NT", aliases: ["heb", "hb"] },
  { id: 59, name: "James", slug: "james", osis: "Jas", testament: "NT", aliases: ["jas", "jm"] },
  { id: 60, name: "1 Peter", slug: "1-peter", osis: "1Pet", testament: "NT", aliases: ["1pet", "1pe", "1pt", "first peter"] },
  { id: 61, name: "2 Peter", slug: "2-peter", osis: "2Pet", testament: "NT", aliases: ["2pet", "2pe", "2pt", "second peter"] },
  { id: 62, name: "1 John", slug: "1-john", osis: "1John", testament: "NT", aliases: ["1jhn", "1jn", "1jo", "first john"] },
  { id: 63, name: "2 John", slug: "2-john", osis: "2John", testament: "NT", aliases: ["2jhn", "2jn", "2jo", "second john"] },
  { id: 64, name: "3 John", slug: "3-john", osis: "3John", testament: "NT", aliases: ["3jhn", "3jn", "3jo", "third john"] },
  { id: 65, name: "Jude", slug: "jude", osis: "Jude", testament: "NT", aliases: ["jud", "jd"] },
  { id: 66, name: "Revelation", slug: "revelation", osis: "Rev", testament: "NT", aliases: ["rev", "re", "apocalypse", "revelations"] },
];

export const BOOKS_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));
export const BOOKS_BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));
export const BOOKS_BY_NAME = new Map(BOOKS.map((b) => [b.name, b]));

/** Normalise "1st Sam." / "I Samuel" / "1 Samuel" to a single comparable key. */
function normalizeBookKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/^(i{1,3})\s+/, (_m, n: string) => `${n.length} `)
    .replace(/^([123])\s*(st|nd|rd)?\s*/, "$1 ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const LOOKUP = new Map<string, BookMeta>();
for (const book of BOOKS) {
  const keys = [book.name, book.slug, book.osis, ...book.aliases];
  for (const key of keys) {
    const normalized = normalizeBookKey(key);
    if (!LOOKUP.has(normalized)) LOOKUP.set(normalized, book);
    // "1 samuel" should also be findable as "1samuel"
    const collapsed = normalized.replace(/\s+/g, "");
    if (!LOOKUP.has(collapsed)) LOOKUP.set(collapsed, book);
  }
}

export function findBook(raw: string): BookMeta | undefined {
  const normalized = normalizeBookKey(raw);
  return LOOKUP.get(normalized) ?? LOOKUP.get(normalized.replace(/\s+/g, ""));
}
