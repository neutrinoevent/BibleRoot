/**
 * The parsing that comes with each word names its grammar but does not explain
 * it. "Verb - Piel - Imperative - masculine singular" is only useful if you
 * already know what a Piel does. This glossary supplies that, so a form page
 * can teach the grammar standing in front of the reader.
 *
 * Terms are matched against the expanded parsing string. Longer terms are
 * matched first and their span removed, so "Imperfect" is never also read as
 * "Perfect", and "Middle or Passive" is not split into two entries.
 */

export interface GrammarNote {
  term: string;
  meaning: string;
}

interface GlossaryEntry {
  /** Alternative spellings; the first is the display label. */
  labels: string[];
  meaning: string;
}

const HEBREW_STEMS: GlossaryEntry[] = [
  {
    labels: ["Qal"],
    meaning:
      "The simple stem: plain active action, with no intensifying or causing. The base form against which the other stems are heard.",
  },
  {
    labels: ["Nifal", "Niphal"],
    meaning:
      "Usually the passive of the simple stem, sometimes reflexive: the subject is acted upon, or acts on itself.",
  },
  {
    labels: ["Piel"],
    meaning:
      "Intensive or factitive: the action is done thoroughly, repeatedly, or is brought about in another — not merely done but made to be so.",
  },
  { labels: ["Pual"], meaning: "The passive of the Piel: the subject undergoes that intensive action." },
  {
    labels: ["Hifil", "Hiphil"],
    meaning:
      "Causative: the subject causes someone or something else to perform the action, or brings the state about.",
  },
  { labels: ["Hofal", "Hophal"], meaning: "The passive of the Hifil: the subject is caused to undergo the action." },
  {
    labels: ["Hitpael", "Hithpael"],
    meaning:
      "Reflexive or reciprocal, often iterative: the subject acts upon itself, or the parties act upon one another.",
  },
  { labels: ["Nithpael"], meaning: "A rare stem, reflexive or passive in force." },
];

const HEBREW_FORMS: GlossaryEntry[] = [
  {
    labels: ["Consecutive Imperfect", "ConsecImperf"],
    meaning:
      "The narrative form. Despite its shape it carries past sense, moving the account forward: “and then he …”. This is the backbone of Hebrew storytelling.",
  },
  {
    labels: ["Imperfect Cohortative", "Imperf.Cohort"],
    meaning: "First-person volition: “let me”, “let us” — resolve, request, or self-encouragement.",
  },
  {
    labels: ["Imperfect Jussive", "Imperf.Jus"],
    meaning: "Third-person volition: “let him”, “may she” — a wish, command, or permission.",
  },
  {
    labels: ["Imperfect"],
    meaning:
      "Action regarded as incomplete: future, habitual, or ongoing. Hebrew marks completeness rather than time, so context sets the tense.",
  },
  {
    labels: ["Perfect"],
    meaning:
      "Action regarded as complete, viewed as a single whole. Commonly past, though it can state a settled truth or a certainty yet to come.",
  },
  { labels: ["Imperative"], meaning: "A direct command or appeal, addressed to someone present." },
  {
    labels: ["Infinitive Absolute", "InfAbs"],
    meaning:
      "The unbound verbal noun, most often used to intensify the verb beside it: “he shall surely die”.",
  },
  { labels: ["Infinitive"], meaning: "The verbal noun: the action named rather than asserted — “to keep”, “in keeping”." },
  {
    labels: ["Participle"],
    meaning:
      "A verbal adjective: action in progress, or the one who does it — “keeping”, “the one who keeps”. It carries no tense of its own.",
  },
  { labels: ["Cohortative"], meaning: "First-person volition: “let me”, “let us”." },
  { labels: ["Jussive"], meaning: "Third-person volition: “let him”, “may she”." },
];

const HEBREW_OTHER: GlossaryEntry[] = [
  {
    labels: ["construct"],
    meaning:
      "Bound to the noun that follows, forming “the X of Y”. The construct noun gives up its own article and stress to the word it leans on.",
  },
];

const GREEK_CASES: GlossaryEntry[] = [
  { labels: ["Nominative"], meaning: "The subject of the clause, or what is predicated of it." },
  {
    labels: ["Genitive"],
    meaning:
      "Source, possession, or separation — usually “of”. It describes or delimits the noun it depends on.",
  },
  {
    labels: ["Dative"],
    meaning:
      "The indirect object, and also means, manner, or location — “to”, “for”, “with”, “in”.",
  },
  {
    labels: ["Accusative"],
    meaning: "The direct object: what the action falls upon. Also marks extent of time or space.",
  },
  { labels: ["Vocative"], meaning: "Direct address: the person or thing being spoken to." },
];

const GREEK_TENSES: GlossaryEntry[] = [
  {
    labels: ["Pluperfect"],
    meaning: "A state existing in the past, resulting from action completed before that.",
  },
  {
    labels: ["Imperfect"],
    meaning:
      "Continuous or repeated action in past time: “he was doing”, “he kept doing”. Often paints the background of a scene.",
  },
  {
    labels: ["Perfect"],
    meaning:
      "Action completed, with its result still standing. The weight lies on the abiding outcome, not the moment of the act.",
  },
  {
    labels: ["Aorist"],
    meaning:
      "Action viewed as a whole, without regard to how long it took. Commonly past in the indicative, but it makes no claim about duration.",
  },
  {
    labels: ["Present"],
    meaning:
      "Action in progress or repeated. In Greek this is aspect before it is time: ongoing, not merely now.",
  },
  { labels: ["Future"], meaning: "Action expected or intended to come about." },
];

const GREEK_VOICES: GlossaryEntry[] = [
  {
    labels: ["Middle or Passive"],
    meaning:
      "The form is identical in both voices here, so the context has to decide whether the subject acts for itself or is acted upon.",
  },
  { labels: ["Active"], meaning: "The subject performs the action." },
  {
    labels: ["Middle"],
    meaning:
      "The subject acts on itself, or acts with a stake in the outcome. English has no direct equivalent, so translations usually flatten it.",
  },
  { labels: ["Passive"], meaning: "The subject receives the action rather than performing it." },
];

const GREEK_MOODS: GlossaryEntry[] = [
  { labels: ["Indicative"], meaning: "A statement of fact, or a question about one." },
  {
    labels: ["Subjunctive"],
    meaning: "Possibility, purpose, or exhortation — what may or should be, rather than what is.",
  },
  {
    labels: ["Optative"],
    meaning: "A wish or a remote possibility. Rare in the New Testament: “may it never be”.",
  },
  { labels: ["Imperative"], meaning: "A command, request, or entreaty." },
  { labels: ["Infinitive"], meaning: "The verbal noun: the action named rather than asserted." },
  {
    labels: ["Participle"],
    meaning:
      "A verbal adjective, carrying both action and agreement with a noun. Greek leans on it heavily where English would use a clause.",
  },
];

function glossaryFor(language: "hebrew" | "greek"): GlossaryEntry[] {
  return language === "greek"
    ? [...GREEK_MOODS, ...GREEK_TENSES, ...GREEK_VOICES, ...GREEK_CASES]
    : [...HEBREW_STEMS, ...HEBREW_FORMS, ...HEBREW_OTHER];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads the expanded parsing and returns an explanation for each grammatical
 * term it names, in the order they appear.
 */
export function explainParsing(
  parsingLong: string | null,
  language: "hebrew" | "greek",
): GrammarNote[] {
  if (!parsingLong) return [];

  // Longest labels first, so "Imperfect Jussive" is claimed before "Imperfect",
  // and "Imperfect" before "Perfect".
  const candidates = glossaryFor(language)
    .flatMap((entry) => entry.labels.map((label) => ({ label, entry })))
    .sort((a, b) => b.label.length - a.label.length);

  let remaining = parsingLong;
  const found: Array<{ index: number; note: GrammarNote }> = [];
  const claimed = new Set<GlossaryEntry>();

  for (const { label, entry } of candidates) {
    if (claimed.has(entry)) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, "i");
    const match = pattern.exec(remaining);
    if (!match) continue;

    claimed.add(entry);
    found.push({
      index: match.index,
      note: { term: entry.labels[0], meaning: entry.meaning },
    });
    // Blank the span so a shorter label cannot match inside it.
    remaining =
      remaining.slice(0, match.index) +
      " ".repeat(match[0].length) +
      remaining.slice(match.index + match[0].length);
  }

  return found.sort((a, b) => a.index - b.index).map((item) => item.note);
}

/* --------------------------------------------------- compound word parts */

/**
 * A third of the words in the Hebrew Bible are written as one word but built
 * from several: an inseparable preposition or the conjunction in front, the
 * stem, and often a pronominal ending. `מֵהוֹנֶךָ` parses as
 * `Preposition-m | Noun - masculine singular construct | second person
 * masculine singular` — "from your wealth" in a single written word.
 *
 * The parsing names those parts but not what they contribute, which is what a
 * reader needs.
 */
export interface WordPart {
  role: "prefix" | "stem" | "suffix";
  /** The Hebrew letter or letters, where the part is a fixed morpheme. */
  form: string | null;
  label: string;
  meaning: string;
}

/** The inseparable prefixes, keyed by how the parsing names them. */
const PREFIXES: Array<{ match: RegExp; form: string | null; label: string; meaning: string }> = [
  {
    match: /^Conjunctive waw/i,
    form: "וְ",
    label: "Conjunctive waw",
    meaning: "“and”, joining this word to what came before. Hebrew narrative leans on it constantly.",
  },
  {
    match: /^Preposition-b/i,
    form: "בְּ",
    label: "Preposition bet",
    meaning: "“in”, “at”, “by” or “with”, depending on what it governs.",
  },
  {
    match: /^Preposition-l/i,
    form: "לְ",
    label: "Preposition lamed",
    meaning: "“to” or “for”, marking direction, purpose or possession.",
  },
  {
    match: /^Preposition-k/i,
    form: "כְּ",
    label: "Preposition kaf",
    meaning: "“like” or “as”, drawing a comparison.",
  },
  {
    match: /^Preposition-m/i,
    form: "מִן",
    label: "Preposition min",
    meaning: "“from” or “out of”, marking source, separation or cause.",
  },
  {
    match: /^Article/i,
    form: "הַ",
    label: "Article",
    meaning: "“the”, making the word definite.",
  },
  {
    match: /^Direct object marker/i,
    form: "אֵת",
    label: "Direct object marker",
    meaning:
      "Untranslated. It marks what follows as the definite object of the verb, a signpost English does without.",
  },
  {
    match: /^Preposition/i,
    form: null,
    label: "Preposition",
    meaning: "Attached to the front of the word rather than standing separately.",
  },
];

/** Pronominal endings, by the person and number the parsing names. */
const SUFFIX_PRONOUNS: Array<{ match: RegExp; possessive: string; object: string }> = [
  { match: /first person common singular/i, possessive: "my", object: "me" },
  { match: /first person common plural/i, possessive: "our", object: "us" },
  { match: /second person masculine singular/i, possessive: "your", object: "you" },
  { match: /second person feminine singular/i, possessive: "your", object: "you" },
  { match: /second person masculine plural/i, possessive: "your", object: "you" },
  { match: /second person feminine plural/i, possessive: "your", object: "you" },
  { match: /third person masculine singular/i, possessive: "his", object: "him" },
  { match: /third person feminine singular/i, possessive: "her", object: "her" },
  { match: /third person masculine plural/i, possessive: "their", object: "them" },
  { match: /third person feminine plural/i, possessive: "their", object: "them" },
];

/**
 * A pronominal ending is a segment that is *only* a person and number. A verb
 * stem names its own subject agreement the same way — "Verb - Qal - Imperfect -
 * third person masculine singular" — so matching anywhere in the segment would
 * mistake the verb itself for a suffix and leave the word with no stem.
 */
const BARE_PRONOUN =
  /^(first|second|third) person\s*(masculine|feminine|common|neuter)?\s*(singular|plural|dual)\d*$/i;

/**
 * Splits a compound parsing into its parts and says what each contributes.
 * Returns an empty list for a word written as a single morpheme.
 */
export function decomposeParsing(parsingLong: string | null): WordPart[] {
  if (!parsingLong || !parsingLong.includes("|")) return [];

  const segments = parsingLong
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length < 2) return [];

  // The stem is the segment naming a part of speech rather than a person.
  let stemIndex = segments.findIndex(
    (segment) =>
      !BARE_PRONOUN.test(segment) && !PREFIXES.some((prefix) => prefix.match.test(segment)),
  );

  // Some words are nothing but a prefix and the morpheme it attaches to, as in
  // "Conjunctive waw | Direct object marker". There the object marker is the
  // word, so the last segment that is not a pronoun becomes the stem.
  if (stemIndex < 0) {
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      if (!BARE_PRONOUN.test(segments[index])) {
        stemIndex = index;
        break;
      }
    }
  }
  const stemIsVerb = stemIndex >= 0 && /^Verb/i.test(segments[stemIndex]);

  const parts: WordPart[] = [];

  segments.forEach((segment, index) => {
    // A prefix segment can name two morphemes at once, "Preposition-b, Article".
    if (stemIndex < 0 || index < stemIndex) {
      for (const piece of segment.split(",").map((value) => value.trim())) {
        const prefix = PREFIXES.find((candidate) => candidate.match.test(piece));
        if (prefix) {
          parts.push({ role: "prefix", form: prefix.form, label: prefix.label, meaning: prefix.meaning });
        }
      }
      return;
    }

    if (index === stemIndex) {
      parts.push({
        role: "stem",
        form: null,
        label: segment,
        meaning: "The word itself, carrying the meaning the rest is built around.",
      });
      return;
    }

    if (BARE_PRONOUN.test(segment)) {
      const pronoun = SUFFIX_PRONOUNS.find((candidate) => candidate.match.test(segment));
      const rendered = pronoun ? (stemIsVerb ? pronoun.object : pronoun.possessive) : null;
      parts.push({
        role: "suffix",
        form: null,
        label: segment,
        meaning: rendered
          ? stemIsVerb
            ? `A pronominal ending: the verb acts on “${rendered}”.`
            : `A pronominal ending: “${rendered}”, attached rather than written separately.`
          : "A pronominal ending attached to the word.",
      });
      return;
    }

    parts.push({
      role: "suffix",
      form: null,
      label: segment,
      meaning: "Carried on the end of the same written word.",
    });
  });

  return parts;
}

/** Person and number, spelled out from the parsing where present. */
export function describePersonNumber(parsingLong: string | null): string | null {
  if (!parsingLong) return null;
  const match =
    /\b(first|second|third) person (masculine|feminine|common|neuter)? ?(singular|plural|dual)\b/i.exec(
      parsingLong,
    ) ?? /\b(1st|2nd|3rd) Person (Singular|Plural)\b/i.exec(parsingLong);
  return match ? match[0] : null;
}
