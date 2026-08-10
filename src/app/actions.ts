"use server";

import { revalidatePath } from "next/cache";

import {
  deleteNote,
  isPassageSaved,
  isTermSaved,
  removePassage,
  removeTerm,
  saveNote,
  savePassage,
  savePassageNotes,
  saveTerm,
  type SaveNoteInput,
  type SavePassageInput,
  type SaveTermInput,
} from "@/lib/library";

function refresh(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

export async function toggleTermAction(input: SaveTermInput): Promise<{ saved: boolean }> {
  // A root and any of its forms are separate entries, so the form decides which
  // one this toggles.
  const form = input.form ?? null;
  const alreadySaved = await isTermSaved(input.strongs, form);
  if (alreadySaved) {
    await removeTerm(input.strongs, form);
  } else {
    await saveTerm(input);
  }
  refresh([`/term/${input.strongs}`, "/library", "/"]);
  if (form) revalidatePath(`/term/${input.strongs}/${encodeURIComponent(form)}`);
  return { saved: !alreadySaved };
}

export async function saveTermNotesAction(
  strongs: string,
  notes: string,
): Promise<{ ok: true }> {
  await saveTerm({ strongs, notes });
  refresh([`/term/${strongs}`, "/library"]);
  return { ok: true };
}

export async function saveNoteAction(input: SaveNoteInput): Promise<{ id: string }> {
  const note = await saveNote(input);
  refresh(["/library", "/"]);
  if (note.ref) revalidatePath("/verse", "layout");
  if (note.strongs) revalidatePath(`/term/${note.strongs}`);
  return { id: note.id };
}

export async function deleteNoteAction(id: string): Promise<{ ok: true }> {
  await deleteNote(id);
  refresh(["/library", "/"]);
  revalidatePath("/verse", "layout");
  return { ok: true };
}

export async function togglePassageAction(
  input: SavePassageInput,
): Promise<{ saved: boolean }> {
  const alreadySaved = await isPassageSaved(input.bookId, input.chapter, input.verses);
  if (alreadySaved) {
    await removePassage(input.bookId, input.chapter, input.verses);
  } else {
    await savePassage(input);
  }
  refresh(["/library", "/"]);
  revalidatePath("/verse", "layout");
  return { saved: !alreadySaved };
}

export async function savePassageNotesAction(
  bookId: number,
  chapter: number,
  verses: number[],
  body: string,
): Promise<{ ok: true }> {
  await savePassageNotes(bookId, chapter, verses, body);
  refresh(["/library"]);
  revalidatePath("/verse", "layout");
  return { ok: true };
}

/**
 * Saves several passages in one go, and says what it actually did.
 *
 * Anything already kept is left alone rather than written a second time, so a
 * reader who saves a verse, adds another to their selection and saves again
 * ends up with what they expect and nothing duplicated.
 */
export async function savePassagesAction(
  inputs: SavePassageInput[],
): Promise<{ saved: number; already: number }> {
  let saved = 0;
  let already = 0;
  for (const input of inputs) {
    if (await isPassageSaved(input.bookId, input.chapter, input.verses)) {
      already += 1;
      continue;
    }
    await savePassage(input);
    saved += 1;
  }
  refresh(["/library", "/"]);
  revalidatePath("/verse", "layout");
  return { saved, already };
}

export async function removePassagesAction(
  passages: Array<{ bookId: number; chapter: number; verses: number[] }>,
): Promise<{ removed: number }> {
  let removed = 0;
  for (const passage of passages) {
    if (!(await isPassageSaved(passage.bookId, passage.chapter, passage.verses))) continue;
    await removePassage(passage.bookId, passage.chapter, passage.verses);
    removed += 1;
  }
  refresh(["/library", "/"]);
  revalidatePath("/verse", "layout");
  return { removed };
}
