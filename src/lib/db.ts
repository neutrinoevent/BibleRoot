import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const DB_PATH = path.join(process.cwd(), "data", "bibleroot.db");

/**
 * The corpus is a large read-only artefact built by `npm run build:data`, so a
 * single connection is shared for the life of the process. It is stashed on
 * globalThis because the dev server re-evaluates modules on every edit.
 */
const globalForDb = globalThis as unknown as {
  __bibleRootDb?: DatabaseSync;
  __bibleRootDbStamp?: string;
};

export function corpusExists(): boolean {
  return fs.existsSync(DB_PATH);
}

/** Identifies a particular build of the corpus file. */
function stamp(): string {
  const info = fs.statSync(DB_PATH);
  return `${info.ino}:${info.mtimeMs}:${info.size}`;
}

export function getDb(): DatabaseSync {
  if (!corpusExists()) {
    throw new Error(
      "Corpus not found. Run `npm run build:data` to download and build data/bibleroot.db.",
    );
  }

  // `npm run build:data` replaces the file wholesale. Without this check a
  // long-running dev server would keep querying the deleted inode and fail on
  // any table added by the rebuild.
  const current = stamp();
  if (globalForDb.__bibleRootDb && globalForDb.__bibleRootDbStamp === current) {
    return globalForDb.__bibleRootDb;
  }

  globalForDb.__bibleRootDb?.close();
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  globalForDb.__bibleRootDb = db;
  globalForDb.__bibleRootDbStamp = current;
  return db;
}

type Params = Array<string | number | null>;

/** node:sqlite returns null-prototype rows; copy them so React can serialise. */
function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

export function queryAll<T>(sql: string, params: Params = []): T[] {
  const rows = getDb()
    .prepare(sql)
    .all(...params) as unknown[];
  return rows.map((row) => plain<T>(row));
}

export function queryOne<T>(sql: string, params: Params = []): T | null {
  const row = getDb()
    .prepare(sql)
    .get(...params);
  return row ? plain<T>(row) : null;
}
