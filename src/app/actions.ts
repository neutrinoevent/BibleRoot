"use server";

import { revalidatePath } from "next/cache";

import {
  deleteNote,
  isTermSaved,
  removeTerm,
  saveNote,
  saveTerm,
  type SaveNoteInput,
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
