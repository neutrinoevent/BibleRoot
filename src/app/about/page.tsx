import Link from "next/link";

export const metadata = { title: "About — BibleRoot" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-serif text-3xl tracking-tight">About BibleRoot</h1>

      <figure className="mt-6 border-l-2 border-accent/50 pl-5">
        <blockquote className="font-serif text-xl leading-relaxed text-ink">
          Your word is a lamp to my feet and a light to my path.
        </blockquote>
        <figcaption className="mt-2 text-sm">
          <Link href="/verse/psalms/119/105" className="text-accent hover:underline">
            Psalm 119:105
          </Link>
        </figcaption>
      </figure>

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
        Every verse is here — all 31,102. Sixteen of them are a special case: Matthew 17:21,
        18:11, 23:14, Mark 7:16, 9:44, 9:46, 11:26, 15:28, Luke 17:36, 23:17, John 5:4, Acts 8:37,
        15:34, 24:7, 28:29 and Romans 16:24. Their numbering comes from Stephanus in 1551, which
        followed later Greek manuscripts; the earliest copies do not contain them. Modern editions
        therefore print them only in a footnote, while the King James and other translations from
        the Traditional Text carry them in full.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        BibleRoot shows those sixteen in full rather than leaving a blank. The reading text is the
        Berean footnote, in the publisher&apos;s own wording; the Greek is that of the manuscripts
        which carry the verse, taken from STEPBible&apos;s amalgamated New Testament; and a panel
        on the verse names the traditions attesting it. They hover, link through to their terms and
        reach the commentaries like any other verse, so you can weigh the evidence rather than take
        anyone&apos;s word for it.
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
        Your saved words and notes are kept in the folder each system sets aside for an
        application&apos;s own files — <code>~/Library/Application Support/BibleRoot</code> on a
        Mac, <code>%APPDATA%\BibleRoot</code> on Windows, and{" "}
        <code>~/.local/share/BibleRoot</code> on Linux. The Library page shows the exact path.
        They survive reinstalling the app and are picked up by whatever backs up your home folder.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Each is a markdown file with a small frontmatter header, one per saved word or note. They
        are yours to read, edit in any editor, search, sync or put under version control.
      </p>

      <h2 className="mt-10 font-serif text-xl">Who made this</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        BibleRoot was built by Alexander Nichols. If you have a question, spot something wrong in the
        text or the lexicons, or want to suggest a feature, the best place is the repository:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li>
          <a
            href="https://github.com/neutrinoevent/BibleRoot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            github.com/neutrinoevent/BibleRoot
          </a>
          <span className="ml-2 text-ink-faint">— the source, and how to build it yourself</span>
        </li>
        <li>
          <a
            href="https://github.com/neutrinoevent/BibleRoot/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Open an issue
          </a>
          <span className="ml-2 text-ink-faint">— questions, corrections and suggestions</span>
        </li>
      </ul>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Corrections to the biblical text or the lexicon entries are worth passing upstream too, to
        whichever source they came from. The projects listed above maintain that data, and a fix
        there reaches everyone using it.
      </p>

      <h2 className="mt-10 font-serif text-xl">Licence</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        The code is released under the <strong>MIT licence</strong>. You are free to use it, change
        it, share it, build on it, and put it to work in something of your own, commercial or not.
        The only condition is that the copyright notice travels with it. Freely received, freely
        given.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        That covers the application. The biblical text, the word alignment and the lexicons are the
        work of others and keep their own terms — the Berean Standard Bible is in the public domain,
        Strong&apos;s dictionaries are CC BY-SA, and the Tyndale lexicons are CC BY 4.0. If you
        redistribute anything built from that data, honour those licences; the{" "}
        <code>NOTICE.md</code> file in the repository sets out which applies to what.
      </p>

      <figure className="mt-12 border-t border-rule pt-8">
        <blockquote className="font-serif text-xl leading-relaxed text-ink">
          <p>Honor the LORD with your wealth and with the firstfruits of all your crops;</p>
          <p className="mt-2">
            then your barns will be filled with plenty, and your vats will overflow with new wine.
          </p>
        </blockquote>
        <figcaption className="mt-3 text-sm">
          <Link href="/verse/proverbs/3/9,10" className="text-accent hover:underline">
            Proverbs 3:9–10
          </Link>
        </figcaption>
      </figure>
    </div>
  );
}
