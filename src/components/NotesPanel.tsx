"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteNoteAction, saveNoteAction } from "@/app/actions";
import type { Note } from "@/lib/library";

interface Props {
  notes: Note[];
  verseRef?: string;
  strongs?: string;
  /** Shown above the composer; defaults to the generic wording. */
  heading?: string;
}

export function NotesPanel({ notes, verseRef, strongs, heading = "Notes" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function reset() {
    setComposing(false);
    setEditingId(null);
    setTitle("");
    setBody("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() && !title.trim()) return;
    startTransition(async () => {
      await saveNoteAction({
        id: editingId ?? undefined,
        title: title.trim() || (verseRef ?? strongs ?? "Note"),
        ref: verseRef ?? null,
        strongs: strongs ?? null,
        body,
      });
      reset();
      router.refresh();
    });
  }

  function edit(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setComposing(true);
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteNoteAction(id);
      if (editingId === id) reset();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg">{heading}</h2>
        {!composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="text-sm text-accent hover:underline"
          >
            + Add note
          </button>
        )}
      </div>

      {notes.length === 0 && !composing && (
        <p className="mt-2 text-sm text-ink-faint">
          Nothing yet. Notes are saved as markdown files in <code>data/library/notes</code>.
        </p>
      )}

      {notes.length > 0 && (
        <ul className="mt-3 space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              id={note.id}
              className="rounded-lg border border-rule bg-paper-raised p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium text-ink">{note.title}</h3>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => edit(note)}
                    className="text-ink-faint hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(note.id)}
                    className="text-ink-faint hover:text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {note.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                  {note.body}
                </p>
              )}
              {note.updatedAt && (
                <p className="mt-2 text-[11px] text-ink-faint">
                  {new Date(note.updatedAt).toLocaleString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {composing && (
        <form
          onSubmit={submit}
          className="mt-3 rounded-lg border border-rule-strong bg-paper-raised p-4"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            aria-label="Note title"
            className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What did you notice?"
            aria-label="Note body"
            rows={5}
            className="mt-2 w-full resize-y rounded-md border border-rule bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {pending ? "Saving…" : editingId ? "Update note" : "Save note"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-ink-faint hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
