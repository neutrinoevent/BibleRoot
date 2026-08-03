export const metadata = { title: "About — BibleRoot" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-serif text-3xl tracking-tight">About BibleRoot</h1>

      <p className="mt-6 leading-relaxed text-ink-soft">
        BibleRoot runs entirely on your machine. The text, the word-by-word alignment and the
        lexicons live in a local SQLite database; your notes and saved terms are plain markdown
        files on disk. Nothing is sent anywhere.
      </p>

      <h2 className="mt-10 font-serif text-xl">Where the data comes from</h2>
      <dl className="mt-4 space-y-5 text-sm">
        <div>
          <dt className="font-medium text-ink">Berean Study Bible</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">
            The English text, and the interlinear tables that align each English phrase to the
            Hebrew, Aramaic or Greek word behind it, with Strong&apos;s numbers and morphology.
            Published freely at bereanbible.com.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Strong&apos;s Hebrew and Greek dictionaries</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">
            James Strong&apos;s 1890/1894 concise dictionaries, digitised by Open Scriptures
            (CC BY-SA). These supply the definitions, derivations and KJV renderings.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Tyndale House / STEPBible brief lexicons</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">
            Concise modern glosses and parts of speech (CC BY 4.0), used for the short gloss shown
            on hover.
          </dd>
        </div>
      </dl>

      <h2 className="mt-10 font-serif text-xl">A note on the text</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Sixteen verse numbers — Matthew 17:21, 18:11, 23:14, Mark 7:16, 9:44, 9:46, 11:26, 15:28,
        Luke 17:36, 23:17, John 5:4, Acts 8:37, 15:34, 24:7, 28:29 and Romans 16:24 — are absent
        from the manuscripts underlying this text. Opening one explains the gap rather than showing
        an empty verse.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Square brackets in the English, such as <em>[the]</em>, mark words the translators supplied
        for sense that have no separate word in the original.
      </p>

      <h2 className="mt-10 font-serif text-xl">Your files</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Saved terms live in <code>data/library/terms/</code> and notes in{" "}
        <code>data/library/notes/</code>, one markdown file each with a small frontmatter header.
        They are yours to grep, edit, sync or put under version control.
      </p>
    </div>
  );
}
