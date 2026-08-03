import "server-only";

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import type { CustomResource, CustomResourceFile } from "./resources";

/**
 * Everything the user creates lives in plain markdown files with a small
 * frontmatter header, so the library stays readable, greppable and
 * version-controllable outside the app:
 *
 *   data/library/terms/H7451.md   — a saved word, plus notes about it
 *   data/library/notes/<id>.md    — a free note, optionally anchored to a verse
 */
export const LIBRARY_DIR = path.join(process.cwd(), "data", "library");
const TERMS_DIR = path.join(LIBRARY_DIR, "terms");
const NOTES_DIR = path.join(LIBRARY_DIR, "notes");

type Frontmatter = Record<string, string | string[]>;

function ensureDirs() {
  fs.mkdirSync(TERMS_DIR, { recursive: true });
  fs.mkdirSync(NOTES_DIR, { recursive: true });
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

/** Strong's ids are already filename-safe, but never trust them blindly. */
function termFile(strongs: string): string {
  const safe = /^[HG]\d+$/.test(strongs) ? strongs : createHash("sha1").update(strongs).digest("hex");
  return path.join(TERMS_DIR, `${safe}.md`);
}

export async function getTerm(strongs: string): Promise<SavedTerm | null> {
  try {
    const raw = await fsp.readFile(termFile(strongs), "utf8");
    const { frontmatter, body } = parse(raw);
    return {
      strongs: str(frontmatter.strongs) ?? strongs,
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

export async function listTerms(): Promise<SavedTerm[]> {
  ensureDirs();
  const files = await fsp.readdir(TERMS_DIR);
  const terms = await Promise.all(
    files.filter((file) => file.endsWith(".md")).map((file) => getTerm(path.basename(file, ".md"))),
  );
  return terms
    .filter((term): term is SavedTerm => term !== null)
    .sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}

export interface SaveTermInput {
  strongs: string;
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
  const existing = await getTerm(input.strongs);
  const now = new Date().toISOString();

  const term: SavedTerm = {
    strongs: input.strongs,
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

  await fsp.writeFile(
    termFile(term.strongs),
    serialize(
      {
        strongs: term.strongs,
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

export async function removeTerm(strongs: string): Promise<void> {
  await fsp.rm(termFile(strongs), { force: true });
}

export async function isTermSaved(strongs: string): Promise<boolean> {
  return (await getTerm(strongs)) !== null;
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
  return path.join(NOTES_DIR, `${safe}.md`);
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
  const files = await fsp.readdir(NOTES_DIR);
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
  const [terms, notes] = await Promise.all([fsp.readdir(TERMS_DIR), fsp.readdir(NOTES_DIR)]);
  return {
    terms: terms.filter((f) => f.endsWith(".md")).length,
    notes: notes.filter((f) => f.endsWith(".md")).length,
  };
}
