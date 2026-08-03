import Link from "next/link";

import { SearchBox } from "@/components/SearchBox";
import { searchVerses } from "@/lib/corpus";
import { hrefForBookId } from "@/lib/refs";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const metadata = { title: "Search — BibleRoot" };

/**
 * FTS5 returns snippets with `<mark>` tags around the matched terms. Everything
 * else is escaped before those tags are restored, so verse text can never
 * inject markup.
 */
function renderSnippet(snippet: string): string {
  return snippet
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const { hits: results, mode } = query
    ? searchVerses(query, 40)
    : { hits: [], mode: "exact" as const };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <SearchBox initialValue={query} />

      {query && (
        <p className="mt-6 text-sm text-ink-faint">
          {results.length === 0 ? (
            "No verses matched."
          ) : mode === "loose" ? (
            <>
              No verse uses those exact words — this text reads differently in the Berean Study
              Bible. Showing the closest verses instead.
            </>
          ) : (
            `${results.length}${results.length === 40 ? "+" : ""} verse${results.length === 1 ? "" : "s"} matched.`
          )}
        </p>
      )}

      {results.length === 0 && query && (
        <p className="mt-4 max-w-prose text-sm text-ink-soft">
          Search looks for the exact words you typed in the Berean Study Bible text. Try fewer
          words, or a reference such as{" "}
          <Link href="/verse/proverbs/20/22" className="text-accent hover:underline">
            Proverbs 20:22
          </Link>
          .
        </p>
      )}

      <ul className="mt-6 divide-y divide-rule border-y border-rule">
        {results.map((hit) => (
          <li key={hit.id} className="py-4">
            <Link
              href={hrefForBookId(hit.book_id, hit.chapter, hit.verse)}
              className="group block"
            >
              <span className="text-xs font-medium text-accent group-hover:underline">
                {hit.ref}
              </span>
              <p
                className="mt-1 font-serif text-lg leading-snug text-ink"
                dangerouslySetInnerHTML={{ __html: renderSnippet(hit.snippet) }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
