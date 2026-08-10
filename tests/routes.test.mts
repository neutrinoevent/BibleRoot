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

describe("choosing a wording never loses a verse", () => {
  const FORM = `/term/G18/${encodeURIComponent("ἀγαθὸν")}`;
  const WORDINGS = ["good", "right", "good thing", "anything good", "a good", "is good", "A good"];
  const query = (chosen: string[]) =>
    chosen.length === 0 ? FORM : `${FORM}?${chosen.map((w) => `as=${encodeURIComponent(w)}`).join("&")}`;
  /** How many the page says it has set aside; nothing hidden reports as zero. */
  const setAside = (text: string): number => {
    const match = /([\d,]+) further occurrence/.exec(text);
    return match ? Number(match[1].replace(/,/g, "")) : 0;
  };

  test("with nothing chosen, everything is there", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const text = await textOf(query([]));
    assert.equal(setAside(text), 0);
    assert.equal(showing(text).shown, showing(text).total);
  });

  test("choosing more wordings shows more verses, never fewer", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const one = showing(await textOf(query(["good"]))).total;
    const two = showing(await textOf(query(["good", "right"]))).total;
    const three = showing(await textOf(query(["good", "right", "good thing"]))).total;
    assert.ok(two > one, `adding a wording reduced the list: ${one} then ${two}`);
    assert.ok(three > two, `adding a wording reduced the list: ${two} then ${three}`);
  });

  test("choosing every wording brings back every occurrence", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const all = showing(await textOf(query([]))).total;
    const text = await textOf(query(WORDINGS));
    assert.equal(showing(text).total, all, "some occurrence could not be reached by any wording");
    assert.equal(setAside(text), 0);
  });

  test("what a filter sets aside is stated, and reversible", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const all = showing(await textOf(query([]))).total;
    const text = await textOf(query(["good"]));
    const { total } = showing(text);
    assert.equal(setAside(text), all - total, "the page did not account for the difference");
    assert.match(text, /Show all/, "no way back to the whole list");
  });

  test("a wording that does not exist shows everything rather than nothing", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const all = showing(await textOf(query([]))).total;
    for (const bogus of [["NOTAWORDING"], [""], ["good'; DROP TABLE words--"]]) {
      assert.equal(showing(await textOf(query(bogus))).total, all, `${bogus[0]} hid verses`);
    }
  });

  test("a bad wording alongside a real one leaves the real one working", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const good = showing(await textOf(query(["good"]))).total;
    assert.equal(showing(await textOf(query(["NOPE", "good"]))).total, good);
    assert.equal(showing(await textOf(query(["good", "good"]))).total, good);
  });

  test("the form list also goes past the old thousand-item ceiling", async (t) => {
    if (!serving) return t.skip("nothing serving");
    // καὶ occurs 8,038 times in this one form; the form page capped at 1,000 too.
    const { shown } = showing(await textOf(`/term/G2532/${encodeURIComponent("καὶ")}?show=1500`));
    assert.equal(shown, 1500);
  });
});

describe("a filter can always be cleared", () => {
  /** The href of the link or chip whose text matches. */
  async function hrefFor(path: string, pattern: RegExp): Promise<string> {
    const html = await (await fetch(`${BASE}${path}`)).text();
    for (const match of html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (pattern.test(text)) return match[1].replace(/&amp;/g, "&");
    }
    throw new Error(`no link matching ${pattern} on ${path}`);
  }

  test("the clearing link carries a path, not only a fragment", async (t) => {
    if (!serving) return t.skip("nothing serving");
    // A bare "#occurrences" is a link to somewhere on the page already open, so
    // the browser keeps the query string and merely scrolls. That left every
    // clear-the-filter control doing nothing at all.
    const all = await hrefFor("/term/H2896?book=16", /^All /);
    assert.ok(all.startsWith("/term/H2896"), `the All chip would not navigate: ${all}`);
    assert.ok(!all.includes("book="), `the All chip keeps the filter: ${all}`);

    const showAll = await hrefFor(`/term/G18/${encodeURIComponent("ἀγαθὸν")}?as=good`, /^Show all/);
    assert.ok(showAll.startsWith("/term/G18/"), `Show all would not navigate: ${showAll}`);
    assert.ok(!showAll.includes("as="), `Show all keeps the filter: ${showAll}`);
  });

  test("a chosen chip offers a way back rather than where it already is", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const html = await (await fetch(`${BASE}/term/H2896?book=19`)).text();
    const chosen = /<a[^>]*aria-pressed="true"[^>]*href="([^"]*)"|<a[^>]*href="([^"]*)"[^>]*aria-pressed="true"/.exec(html);
    assert.ok(chosen, "no chosen chip found");
    const href = (chosen[1] ?? chosen[2]).replace(/&amp;/g, "&");
    assert.ok(!href.includes("book=19"), `clicking the chosen chip would change nothing: ${href}`);
  });
});

describe("narrowing to several books at once", () => {
  test("two books show the sum of both", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const psalms = showing(await textOf("/term/H2896?book=19")).total;
    const proverbs = showing(await textOf("/term/H2896?book=20")).total;
    const both = showing(await textOf("/term/H2896?book=19&book=20")).total;
    assert.equal(both, psalms + proverbs);
  });

  test("every book together is every occurrence", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const all = showing(await textOf("/term/H2896")).total;
    const html = await (await fetch(`${BASE}/term/H2896`)).text();
    const books = [...new Set([...html.matchAll(/book=(\d+)/g)].map((m) => m[1]))];
    assert.ok(books.length > 5, "expected a spread of books");
    const query = books.map((id) => `book=${id}`).join("&");
    assert.equal(showing(await textOf(`/term/H2896?${query}`)).total, all);
  });

  test("a book the word never appears in is ignored, not obeyed", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const all = showing(await textOf("/term/H2896")).total;
    for (const bad of ["book=999", "book=abc", "book=", "book=-1"]) {
      assert.equal(showing(await textOf(`/term/H2896?${bad}`)).total, all, `${bad} hid verses`);
    }
    // A real book alongside a bad one still narrows to the real one.
    const psalms = showing(await textOf("/term/H2896?book=19")).total;
    assert.equal(showing(await textOf("/term/H2896?book=999&book=19")).total, psalms);
  });
});

describe("keeping a verse", () => {
  test("every verse page offers to save, and says which it means", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const single = await textOf("/verse/proverbs/20/22");
    assert.match(single, /Save this verse/, "a verse cannot be kept");

    const selection = await textOf("/verse/john/1/1,7,10");
    assert.match(selection, /Save these verses/, "a selection cannot be kept");
  });

  test("the library explains itself before anything is in it", async (t) => {
    if (!serving) return t.skip("nothing serving");
    const text = await textOf("/library");
    assert.match(text, /Saved passages/, "the library does not mention passages");
  });
});

describe("the deeper-dive links are reachable", () => {
  test("they come before the occurrence list, not after it", async (t) => {
    if (!serving) return t.skip("nothing serving");
    // Below a list that can run to 19,922 entries, nobody would ever meet them.
    for (const path of ["/term/H2896", `/term/G18/${encodeURIComponent("ἀγαθὸν")}`]) {
      const text = await textOf(path);
      const links = text.indexOf("Take it further");
      const occurrences = text.search(/Every occurrence|The occurrences you chose/);
      assert.ok(links > 0, `${path} has no outbound links`);
      assert.ok(occurrences > 0, `${path} has no occurrence list`);
      assert.ok(links < occurrences, `${path} still buries its links below the occurrences`);
    }
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
