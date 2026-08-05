import { NextResponse } from "next/server";

import {
  countFormOccurrences,
  getForm,
  getFormOccurrences,
  getRenderings,
  getStrongs,
} from "@/lib/corpus";
import { decomposeParsing, explainParsing } from "@/lib/morphology";
import { isEnglishPlaceholder } from "@/lib/render";

interface Params {
  params: Promise<{ strongs: string; form: string }>;
}

/** How many verses the preview shows before sending you to the full entry. */
const PREVIEW_VERSES = 3;

/**
 * Detail for a single inflected form, fetched when the reader opens one in the
 * list of forms. Roots can carry hundreds of forms, so sending them all with
 * the page would be wasteful; this is loaded on demand and kept by the client.
 */
export async function GET(_request: Request, { params }: Params) {
  const { strongs: rawStrongs, form: rawForm } = await params;
  const strongs = rawStrongs.toUpperCase();
  if (!/^[HG]\d+$/.test(strongs)) {
    return NextResponse.json({ error: "Unknown reference" }, { status: 400 });
  }

  const original = decodeURIComponent(rawForm);
  const entry = getStrongs(strongs);
  const form = getForm(strongs, original);
  if (!entry || !form) {
    return NextResponse.json({ error: "No such form" }, { status: 404 });
  }

  const total = countFormOccurrences(strongs, form.original);
  const occurrences = getFormOccurrences(strongs, form.original, PREVIEW_VERSES).map(
    (occurrence) => ({
      ref: occurrence.ref,
      book_id: occurrence.book_id,
      chapter: occurrence.chapter,
      verse: occurrence.verse,
      text: occurrence.text,
      english: isEnglishPlaceholder(occurrence.english) ? null : occurrence.english!.trim(),
    }),
  );

  return NextResponse.json({
    strongs,
    original: form.original,
    translit: form.translit,
    parsing: form.parsing_long ?? form.parsing,
    language: entry.language,
    lemma: entry.lemma,
    gloss: entry.gloss,
    grammar: explainParsing(form.parsing_long, entry.language),
    parts: decomposeParsing(form.parsing_long),
    renderings: getRenderings(strongs, form.original, 8),
    total,
    occurrences,
  });
}
