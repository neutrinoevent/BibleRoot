import "server-only";

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { displayPath, resolveLibraryRoot } from "./library-location";
import type { CustomResource, CustomResourceFile } from "./resources";

/**
 * Everything the user creates lives in plain markdown files with a small
 * frontmatter header, so the library stays readable, greppable and
 * version-controllable outside the app:
 *
 *   terms/H7451.md   — a saved word, plus notes about it
 *   notes/<id>.md    — a free note, optionally anchored to a verse
 *
 * They sit in the folder this platform keeps an application's files in, not in
 * the project, so that reinstalling or rebuilding never touches them.
 */
/** The library folder for this platform, created on first use. */
export function libraryRoot(): string {
  return resolveLibraryRoot();
}

/** The same path, shortened with ~ for showing on screen. */
export function libraryRootForDisplay(): string {
  return displayPath(resolveLibraryRoot());
}

const termsDirectory = () => path.join(resolveLibraryRoot(), "terms");
const notesDirectory = () => path.join(resolveLibraryRoot(), "notes");

type Frontmatter = Record<string, string | string[]>;

function ensureDirs() {
  fs.mkdirSync(termsDirectory(), { recursive: true });
  fs.mkdirSync(notesDirectory(), { recursive: true });
}

function serializeValue(value: string | string[]): string {
  if (Array.isArray(value)) return `[${value.map((v) => v.replace(/[[\],]/g, " ").trim()).join(", ")}]`;
  return value.replace(/\r?\n/g, " ").trim();
}

function serialize(frontmatter: Frontmatter, body: string): string {
  const lines = Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined && value !== null && String(value).length > 0)
    .map(([key, value]) => `${key}: ${serializeValue(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.trimEnd()}\n`;
}

function parse(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  const frontmatter: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key) continue;
    if (value.startsWith("[") && value.endsWith("]")) {
      frontmatter[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      frontmatter[key] = value;
    }
  }
  return { frontmatter, body: match[2].trim() };
}

function str(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value.join(", ") : value;
}

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : value.split(",").map((v) => v.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ terms */

export interface SavedTerm {
  strongs: string;
  /**
   * The exact inflected form, when the reader saved a particular shape of the
   * word rather than the word itself. A root and any number of its forms can be
   * saved side by side; they are separate entries.
   */
  form: string | null;
  parsing: string | null;
  lemma: string | null;
  translit: string | null;
  gloss: string | null;
  language: string | null;
  /** The verse the term was first saved from, for context. */
  sourceRef: string | null;
  tags: string[];
  notes: string;
  savedAt: string;
  updatedAt: string;
}

function safeStrongs(strongs: string): string {
  return /^[HG]\d+$/.test(strongs)
    ? strongs
    : createHash("sha1").update(strongs).digest("hex").slice(0, 12);
}

/**
 * A root is filed under its Strong's number; a form adds its transliteration so
 * the filename still says what it holds — `H1952--me-ho-w-ne-ka.md`. Hebrew in
 * a filename would be at the mercy of how the filesystem normalises it, so the
 * exact form lives in the frontmatter and the name stays ASCII.
 */
function termFile(strongs: string, form?: string | null, translit?: string | null): string {
  const base = safeStrongs(strongs);
  if (!form) return path.join(termsDirectory(), `${base}.md`);
  const slug =
    slugifyAscii(translit ?? "") ||
    createHash("sha1").update(form.normalize("NFC")).digest("hex").slice(0, 10);
  return path.join(termsDirectory(), `${base}--${slug}.md`);
}

function slugifyAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const sameForm = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").normalize("NFC") === (b ?? "").normalize("NFC");

/**
 * Finds the entry for a particular root or form.
 *
 * Matching is on what a file *contains* — its Strong's number and its form —
 * never on what it is called. The filename is a convenience for reading the
 * directory; two forms could slug alike, a file could be renamed by hand, and
 * an entry saved before forms existed carries no form at all. A root and each
 * of its forms are wholly separate entries, so starring one must never be read
 * as starring another.
 */
async function findTermFile(strongs: string, form?: string | null): Promise<string | null> {
  ensureDirs();
  const wanted = form ?? null;

  // The root's own file has a predictable name, so try it before reading the
  // whole directory.
  if (!wanted) {
    const direct = path.join(termsDirectory(), `${safeStrongs(strongs)}.md`);
    const parsed = await readTermFile(direct);
    if (parsed && parsed.strongs === strongs && !parsed.form) return direct;
  }

  for (const file of await fsp.readdir(termsDirectory())) {
    if (!file.endsWith(".md")) continue;
    const full = path.join(termsDirectory(), file);
    const parsed = await readTermFile(full);
    if (!parsed || parsed.strongs !== strongs) continue;
    if (sameForm(parsed.form, wanted)) return full;
  }
  return null;
}

/**
 * Where a new entry should be written. Two forms of one root can transliterate
 * alike, so a name already holding a different form is stepped past rather than
 * overwritten.
 */
async function allocateTermFile(
  strongs: string,
  form: string | null,
  translit: string | null,
): Promise<string> {
  const first = termFile(strongs, form, translit);
  if (!form) return first;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate =
      attempt === 0 ? first : termFile(strongs, form, `${translit ?? "form"}-${attempt + 1}`);
    const parsed = await readTermFile(candidate);
    if (!parsed || sameForm(parsed.form, form)) return candidate;
  }
  return termFile(strongs, form, createHash("sha1").update(form).digest("hex").slice(0, 10));
}

async function readTermFile(file: string): Promise<SavedTerm | null> {
  try {
    const raw = await fsp.readFile(file, "utf8");
    const { frontmatter, body } = parse(raw);
    return {
      strongs: str(frontmatter.strongs) ?? "",
      form: str(frontmatter.form) ?? null,
      parsing: str(frontmatter.parsing) ?? null,
      lemma: str(frontmatter.lemma) ?? null,
      translit: str(frontmatter.translit) ?? null,
      gloss: str(frontmatter.gloss) ?? null,
      language: str(frontmatter.language) ?? null,
      sourceRef: str(frontmatter.source_ref) ?? null,
      tags: list(frontmatter.tags),
      notes: body,
      savedAt: str(frontmatter.saved_at) ?? "",
      updatedAt: str(frontmatter.updated_at) ?? "",
    };
  } catch {
    return null;
  }
}

export async function getTerm(strongs: string, form?: string | null): Promise<SavedTerm | null> {
  const file = await findTermFile(strongs, form ?? null);
  if (!file) return null;
  const term = await readTermFile(file);
  return term ? { ...term, strongs: term.strongs || strongs } : null;
}

/**
 * Identifies one saved entry. A root and any number of its forms share a
 * Strong's number, so the number alone collides between them.
 */
export function savedTermKey(term: Pick<SavedTerm, "strongs" | "form">): string {
  return term.form ? `${term.strongs}:${term.form}` : term.strongs;
}

export async function listTerms(): Promise<SavedTerm[]> {
  ensureDirs();
  const files = await fsp.readdir(termsDirectory());
  const terms = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .map((file) => readTermFile(path.join(termsDirectory(), file))),
  );
  return terms
    .filter((term): term is SavedTerm => term !== null && Boolean(term.strongs))
    .sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}

export interface SaveTermInput {
  strongs: string;
  /** Present when saving one inflected form rather than the word itself. */
  form?: string | null;
  parsing?: string | null;
  lemma?: string | null;
  translit?: string | null;
  gloss?: string | null;
  language?: string | null;
  sourceRef?: string | null;
  tags?: string[];
  notes?: string;
}

export async function saveTerm(input: SaveTermInput): Promise<SavedTerm> {
  ensureDirs();
  const form = input.form ?? null;
  const existing = await getTerm(input.strongs, form);
  const now = new Date().toISOString();

  const term: SavedTerm = {
    strongs: input.strongs,
    form,
    parsing: input.parsing ?? existing?.parsing ?? null,
    lemma: input.lemma ?? existing?.lemma ?? null,
    translit: input.translit ?? existing?.translit ?? null,
    gloss: input.gloss ?? existing?.gloss ?? null,
    language: input.language ?? existing?.language ?? null,
    sourceRef: input.sourceRef ?? existing?.sourceRef ?? null,
    tags: input.tags ?? existing?.tags ?? [],
    notes: input.notes ?? existing?.notes ?? "",
    savedAt: existing?.savedAt || now,
    updatedAt: now,
  };

  const file =
    (await findTermFile(term.strongs, form)) ??
    (await allocateTermFile(term.strongs, form, term.translit));

  await fsp.writeFile(
    file,
    serialize(
      {
        strongs: term.strongs,
        form: term.form ?? "",
        parsing: term.parsing ?? "",
        lemma: term.lemma ?? "",
        translit: term.translit ?? "",
        gloss: term.gloss ?? "",
        language: term.language ?? "",
        source_ref: term.sourceRef ?? "",
        tags: term.tags,
        saved_at: term.savedAt,
        updated_at: term.updatedAt,
      },
      term.notes,
    ),
    "utf8",
  );
  return term;
}

export async function removeTerm(strongs: string, form?: string | null): Promise<void> {
  const file = await findTermFile(strongs, form ?? null);
  if (file) await fsp.rm(file, { force: true });
}

export async function isTermSaved(strongs: string, form?: string | null): Promise<boolean> {
  return (await getTerm(strongs, form)) !== null;
}

/* ------------------------------------------------------------------ notes */

export interface Note {
  id: string;
  title: string;
  ref: string | null;
  strongs: string | null;
  tags: string[];
  body: string;
  createdAt: string;
  updatedAt: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function noteFile(id: string): string {
  const safe = slugify(id) || createHash("sha1").update(id).digest("hex").slice(0, 12);
  return path.join(notesDirectory(), `${safe}.md`);
}

export async function getNote(id: string): Promise<Note | null> {
  try {
    const raw = await fsp.readFile(noteFile(id), "utf8");
    const { frontmatter, body } = parse(raw);
    return {
      id: str(frontmatter.id) ?? id,
      title: str(frontmatter.title) ?? "Untitled note",
      ref: str(frontmatter.ref) ?? null,
      strongs: str(frontmatter.strongs) ?? null,
      tags: list(frontmatter.tags),
      body,
      createdAt: str(frontmatter.created_at) ?? "",
      updatedAt: str(frontmatter.updated_at) ?? "",
    };
  } catch {
    return null;
  }
}

export async function listNotes(): Promise<Note[]> {
  ensureDirs();
  const files = await fsp.readdir(notesDirectory());
  const notes = await Promise.all(
    files.filter((file) => file.endsWith(".md")).map((file) => getNote(path.basename(file, ".md"))),
  );
  return notes
    .filter((note): note is Note => note !== null)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export async function notesForRef(ref: string): Promise<Note[]> {
  return (await listNotes()).filter((note) => note.ref === ref);
}

export async function notesForStrongs(strongs: string): Promise<Note[]> {
  return (await listNotes()).filter((note) => note.strongs === strongs);
}

export interface SaveNoteInput {
  id?: string;
  title: string;
  ref?: string | null;
  strongs?: string | null;
  tags?: string[];
  body: string;
}

/** Two notes on the same verse on the same day must not collide. */
async function uniqueNoteId(base: string): Promise<string> {
  let candidate = base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    try {
      await fsp.access(noteFile(candidate));
    } catch {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function saveNote(input: SaveNoteInput): Promise<Note> {
  ensureDirs();
  const now = new Date().toISOString();
  const existing = input.id ? await getNote(input.id) : null;

  // New notes get a date-prefixed, human-scannable filename.
  const base = `${now.slice(0, 10)}-${
    slugify(input.ref ?? input.strongs ?? input.title) || randomUUID().slice(0, 8)
  }`;
  const id = existing?.id ?? input.id ?? (await uniqueNoteId(base));

  const note: Note = {
    id,
    title: input.title.trim() || "Untitled note",
    ref: input.ref ?? existing?.ref ?? null,
    strongs: input.strongs ?? existing?.strongs ?? null,
    tags: input.tags ?? existing?.tags ?? [],
    body: input.body,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await fsp.writeFile(
    noteFile(note.id),
    serialize(
      {
        id: note.id,
        title: note.title,
        ref: note.ref ?? "",
        strongs: note.strongs ?? "",
        tags: note.tags,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      },
      note.body,
    ),
    "utf8",
  );
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  await fsp.rm(noteFile(id), { force: true });
}

/* ------------------------------------------------------ custom resources */

/**
 * Optional `data/resources.json` lets the reader add their own scholarly
 * destinations alongside the built-in ones. A malformed file is ignored rather
 * than breaking the page — it is hand-edited, so mistakes are expected.
 */
export async function readCustomResources(): Promise<CustomResourceFile> {
  try {
    const raw = await fsp.readFile(path.join(process.cwd(), "data", "resources.json"), "utf8");
    const parsed = JSON.parse(raw) as CustomResourceFile;
    const valid = (list: unknown): CustomResource[] =>
      Array.isArray(list)
        ? (list.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              typeof (item as CustomResource).label === "string" &&
              typeof (item as CustomResource).url === "string" &&
              /^https?:\/\//i.test((item as CustomResource).url),
          ) as CustomResource[])
        : [];
    return { term: valid(parsed.term), verse: valid(parsed.verse) };
  } catch {
    return {};
  }
}

export async function libraryCounts(): Promise<{ terms: number; notes: number }> {
  ensureDirs();
  const [terms, notes] = await Promise.all([fsp.readdir(termsDirectory()), fsp.readdir(notesDirectory())]);
  return {
    terms: terms.filter((f) => f.endsWith(".md")).length,
    notes: notes.filter((f) => f.endsWith(".md")).length,
  };
}
