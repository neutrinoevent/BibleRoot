/**
 * Checks the pages themselves, against a running dev server.
 *
 * The data tests cannot reach these: the occurrence list was capped in the page
 * rather than in the query, so every query-level assertion passed while the
 * reader could not get past the thousandth occurrence of the commonest word in
 * the New Testament.
 *
 * Skips entirely when nothing is serving, so `npm test` stays useful alone.
 * Start the server with `npm run dev` to include them.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BIBLEROOT_URL ?? "http://localhost:3000";

let serving = false;
before(async () => {
  try {
    const response = await fetch(BASE, { signal: AbortSignal.timeout(2500) });
    serving = response.ok;
  } catch {
    serving = false;
  }
});

/** Next streams comment markers into the HTML, so compare on text alone. */
async function textOf(path: string): Promise<string> {
  const response = await fetch(`${BASE}${path}`);
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  const html = await response.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function showing(text: string): { shown: number; total: number } {
  const match = /showing ([\d,]+) of ([\d,]+)/.exec(text);
  assert.ok(match, "the occurrence heading did not say how many it was showing");
  return {
    shown: Number(match[1].replace(/,/g, "")),
    total: Number(match[2].replace(/,/g, "")),
  };
}

describe("every occurrence really is every occurrence", () => {
  test("the list goes past the old thousand-item ceiling", async (t) => {
    if (!serving) return t.skip(`nothing serving at ${BASE}`);
    const { shown, total } = showing(await textOf("/term/G3588?show=1200"));
    assert.equal(shown, 1200, "the list stopped short of what was asked for");
    assert.ok(total > 19000);
  });

  test("asking for more than there are shows all of them", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const { shown, total } = showing(await textOf("/term/H2617?show=99999"));
    assert.equal(shown, total);
  });

  test("narrowing to one book narrows the count", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const whole = showing(await textOf("/term/H2617"));
    const psalms = showing(await textOf("/term/H2617?book=19"));
    assert.ok(psalms.total > 0 && psalms.total < whole.total);
  });
});

describe("the particles have somewhere to live", () => {
  test("each of the eight serves its lexicon entry", async (t) => {
    if (!serving) return t.skip("nothing serving");
    // Only bet gets a long article; the rest are brief in this digitisation, so
    // a length threshold measures the source rather than the page. Check that
    // the lexicon and the particle's own explanation both arrived instead.
    for (const [letter, form] of [
      ["b", "בְּ"],
      ["c", "וְ"],
      ["d", "הַ"],
      ["i", "הֲ"],
      ["k", "כְּ"],
      ["l", "לְ"],
      ["m", "מִן"],
      ["s", "שֶׁ"],
    ]) {
      const text = await textOf(`/particle/${letter}`);
      assert.match(text, /Brown-Driver-Briggs/, `/particle/${letter} has no lexicon`);
      assert.ok(text.includes(form), `/particle/${letter} does not show ${form}`);
      assert.match(text, /Written joined to the next word/i, `/particle/${letter} lost its framing`);
    }
  });

  test("a compound word offers the lexicon on its prefix", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const text = await textOf(`/term/H1952/${encodeURIComponent("מֵהוֹנֶ֑ךָ")}`);
    assert.match(text, /Brown-Driver-Briggs on preposition min/);
  });
});

describe("the pages a reader actually opens", () => {
  test("load without erroring", async (t) => {
    if (!serving) return t.skip("nothing serving");
    for (const path of ["/", "/read/proverbs/20", "/verse/proverbs/20/22", "/term/G26", "/library", "/about"]) {
      const response = await fetch(`${BASE}${path}`);
      assert.equal(response.status, 200, `${path} returned ${response.status}`);
    }
  });
});
