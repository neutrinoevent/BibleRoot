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
        <div>
          <dt className="font-medium text-ink">Brown-Driver-Briggs</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">
            <em>A Hebrew and English Lexicon of the Old Testament</em> (1906), digitised by Open
            Scriptures. Still the standard reference for biblical Hebrew and Aramaic. Its entries
            appear in full on term pages, along with the TWOT numbers from the same index.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Abbott-Smith</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">
            <em>A Manual Greek Lexicon of the New Testament</em> (1922), digitised by Translatable
            Exegetical Tools. Gives the sense hierarchy of each Greek word along with the
            distinctions between near synonyms.
          </dd>
        </div>
      </dl>

      <h2 className="mt-10 font-serif text-xl">Going deeper</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Term and verse pages both link out to the standard scholarly tools — Bible Hub and the
        Englishman&apos;s Concordance, Blue Letter Bible, STEPBible, Logeion for the classical
        Greek lexica, the NET Bible translators&apos; notes, and Sefaria for the Jewish commentary
        tradition on the Hebrew Bible.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        To add destinations of your own, copy <code>data/resources.example.json</code> to{" "}
        <code>data/resources.json</code> and list them there. They appear alongside the built-in
        links, marked <em>yours</em>.
      </p>

      <h2 className="mt-10 font-serif text-xl">A note on the text</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Sixteen verse numbers — Matthew 17:21, 18:11, 23:14, Mark 7:16, 9:44, 9:46, 11:26, 15:28,
        Luke 17:36, 23:17, John 5:4, Acts 8:37, 15:34, 24:7, 28:29 and Romans 16:24 — are absent
        from the manuscripts underlying this text. Opening one explains the gap rather than showing
        an empty verse.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        The verse you read is the publisher&apos;s own text, word for word. The interlinear tables
        that align it to the original are separate, and occasionally leave a quotation unclosed, so
        the published edition is used for reading and the aligned words are laid over it.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Words the translators supplied for English sense, with no separate word behind them in the
        original, are shown in a lighter tone in the reading line and bracketed in the interlinear,
        as <em>[the]</em>.
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
