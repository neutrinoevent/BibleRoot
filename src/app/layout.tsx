import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Newsreader, Noto_Serif, Noto_Serif_Hebrew } from "next/font/google";

import "./globals.css";

const sans = Inter({ variable: "--font-sans-ui", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif-text", subsets: ["latin"] });
// Biblical Greek and pointed Hebrew need faces that actually carry the marks:
// polytonic accents and breathings, vowel points and cantillation.
const greek = Noto_Serif({ variable: "--font-greek-text", subsets: ["greek", "greek-ext"] });
const hebrew = Noto_Serif_Hebrew({ variable: "--font-hebrew-text", subsets: ["hebrew"] });

export const metadata: Metadata = {
  title: "BibleRoot",
  description: "Read a verse, hover any word, and follow it back to the original language.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${greek.variable} ${hebrew.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-5 py-3">
            <Link href="/" className="group flex items-baseline gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight">BibleRoot</span>
              <span className="font-hebrew text-base text-hebrew transition-opacity group-hover:opacity-70">
                שֹׁרֶשׁ
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-5 text-sm text-ink-soft">
              <Link href="/library" className="transition-colors hover:text-ink">
                Library
              </Link>
              <Link href="/about" className="transition-colors hover:text-ink">
                About
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-rule px-5 py-6 text-xs text-ink-faint">
          <div className="mx-auto max-w-5xl">
            English text: Berean Study Bible. Word alignment: Berean interlinear tables. Lexicons:
            Strong&apos;s (Open Scriptures) and Tyndale/STEPBible.
          </div>
        </footer>
      </body>
    </html>
  );
}
