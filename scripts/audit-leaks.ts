/**
 * Checks that nothing private has been committed: no one's home directory, no
 * keys or tokens, and none of the working files that are meant to stay local.
 *
 *   node scripts/audit-leaks.ts             the files git is tracking now
 *   node scripts/audit-leaks.ts --history   every file in every commit, ever
 *
 * A scan that reports nothing is only worth having if it could have reported
 * something, and a mistyped pattern looks exactly like a clean repository. So
 * every rule below carries an example it must catch and an example it must
 * ignore, and the whole run stops before it starts if any rule fails its own
 * test. The example text is assembled from pieces rather than written out, so
 * that this file does not trip the very rules it defines.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";

interface Rule {
  name: string;
  pattern: RegExp;
  /**
   * Written out here rather than built from the rule's own ingredients: an
   * example made of the same pieces as the pattern would still match after a
   * typo in those pieces, and the test would pass while the rule looked for
   * the wrong thing entirely.
   */
  catches: string;
  /** This rule is too broad if it flags this. */
  ignores: string;
}

/**
 * Every piece of sensitive-looking text below is joined together at runtime, so
 * that this file never contains, as one continuous string, anything its own
 * rules are looking for. Written out plainly, the rules would report themselves
 * on every run, and a check that always fails is a check people stop reading.
 */
const join = (...parts: string[]): string => parts.join("");

const HOME_ROOTS = ["Users", "home", "Volumes"];
const KEY_HEAD = ["-----BEGIN", "PRIVATE", "KEY"];
const CREDENTIAL_FILES = [
  join(".aws", "/credentials"),
  join(".net", "rc"),
  join("id_", "rsa"),
  join(".ssh", "/id_"),
];

const RULES: Rule[] = [
  {
    name: "someone's home directory",
    pattern: new RegExp(`/(?:${HOME_ROOTS.join("|")})/[A-Za-z0-9._-]+|[A-Z]:\\\\Users\\\\`),
    catches: join("/", "Users", "/ada/notes.md"),
    ignores: "~/Library/Application Support/BibleRoot",
  },
  {
    name: "private key",
    pattern: new RegExp(`${KEY_HEAD[0]} [A-Z ]*${KEY_HEAD[1]} ${KEY_HEAD[2]}`),
    catches: join("-----BEGIN", " RSA ", "PRIVATE", " ", "KEY"),
    ignores: "the key of the covenant",
  },
  {
    name: "cloud access key",
    pattern: /AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}/,
    catches: `AKIA${"Q".repeat(16)}`,
    ignores: "AKIA is a prefix used by one cloud provider",
  },
  {
    name: "password or token in a setting",
    pattern: /(?:api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["']?[A-Za-z0-9/+_-]{16,}/i,
    catches: `api_key = ${"x".repeat(20)}`,
    ignores: "token: null",
  },
  {
    name: "credentials sent to a service",
    pattern: /authorization\s*:\s*(?:bearer|basic)\s+\S+/i,
    catches: join("Authorization: ", "Bearer ", "abc.def"),
    ignores: "authorization is handled by the reader's own machine",
  },
  {
    name: "a credential file",
    pattern: new RegExp(CREDENTIAL_FILES.map((f) => f.replace(/[.\/]/g, "\\$&")).join("|")),
    catches: join(".ssh", "/id_", "ed25519"),
    ignores: "credentials are never needed here",
  },
];

/** Files that exist locally and must never be committed. */
const KEEP_LOCAL = ["CLAUDE.md", "docs/HANDOFF.md", "docs/WORKLOG.md", "data/library/"];

const SKIP = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|svg|pdf|zip|db)$/i;

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
}

/** A rule that cannot catch its own example would report a clean repository. */
function selfTest(): void {
  const broken: string[] = [];
  for (const rule of RULES) {
    if (!rule.pattern.test(rule.catches)) broken.push(`${rule.name}: missed its own example`);
    if (rule.pattern.test(rule.ignores)) broken.push(`${rule.name}: flagged ordinary text`);
  }
  if (broken.length > 0) {
    console.error("These rules are broken, so this scan proves nothing:\n");
    for (const line of broken) console.error(`  ${line}`);
    process.exit(2);
  }
}

interface Finding {
  where: string;
  rule: string;
  line: number;
  text: string;
}

function inspect(where: string, body: string, found: Finding[]): void {
  const lines = body.split("\n");
  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i += 1) {
      const hit = rule.pattern.exec(lines[i]);
      if (hit) found.push({ where, rule: rule.name, line: i + 1, text: hit[0].slice(0, 80) });
    }
  }
}

function scanTracked(found: Finding[]): number {
  const files = git("ls-files").split("\n").filter(Boolean);
  let read = 0;
  for (const file of files) {
    if (SKIP.test(file) || !fs.existsSync(file)) continue;
    read += 1;
    inspect(file, fs.readFileSync(file, "utf8"), found);
  }
  return read;
}

function scanHistory(found: Finding[]): number {
  const seen = new Set<string>();
  let read = 0;
  for (const line of git("rev-list", "--objects", "--all").split("\n")) {
    const space = line.indexOf(" ");
    if (space < 0) continue;
    const sha = line.slice(0, space);
    const path = line.slice(space + 1).trim();
    if (!path || SKIP.test(path) || seen.has(sha)) continue;
    seen.add(sha);
    if (git("cat-file", "-t", sha).trim() !== "blob") continue;
    read += 1;
    inspect(`${path} (in history)`, git("cat-file", "-p", sha), found);
  }
  return read;
}

/** Working files can be committed by a stray `git add -A`, so check by name too. */
function checkKeptLocal(found: Finding[]): void {
  const tracked = new Set(git("ls-files").split("\n").filter(Boolean));
  for (const entry of KEEP_LOCAL) {
    const committed = entry.endsWith("/")
      ? [...tracked].filter((f) => f.startsWith(entry))
      : tracked.has(entry)
        ? [entry]
        : [];
    for (const file of committed) {
      found.push({ where: file, rule: "meant to stay on your machine", line: 0, text: entry });
    }
  }
}

const history = process.argv.includes("--history");
selfTest();

const found: Finding[] = [];
checkKeptLocal(found);
const read = history ? scanHistory(found) : scanTracked(found);

const scope = history ? `${read} files across every commit` : `${read} tracked files`;
if (found.length === 0) {
  console.log(`Nothing private found in ${scope}. All ${RULES.length} rules passed their own tests.`);
  process.exit(0);
}

console.error(`Found ${found.length} thing(s) that should not be in the repository:\n`);
for (const f of found) {
  const at = f.line > 0 ? `:${f.line}` : "";
  console.error(`  ${f.where}${at}\n    ${f.rule} — ${f.text}\n`);
}
console.error(
  history
    ? "Removing these needs the history rewritten, not just a new commit."
    : "Untrack these and add them to .gitignore before committing.",
);
process.exit(1);
