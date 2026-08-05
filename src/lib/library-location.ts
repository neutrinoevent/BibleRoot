import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Where the reader's saved words and notes are kept.
 *
 * Each platform has a conventional home for files an application looks after on
 * the user's behalf, and BibleRoot uses it rather than asking anyone to choose:
 *
 *   macOS    ~/Library/Application Support/BibleRoot
 *   Windows  %APPDATA%\BibleRoot
 *   Linux    $XDG_DATA_HOME/BibleRoot, or ~/.local/share/BibleRoot
 *
 * These are inside the user's own account, survive reinstalling the app, and are
 * backed up by the usual system tools. Nothing about the location is settable
 * from the interface: a form that writes to a path of the visitor's choosing is
 * a liability the app does not need.
 */
export const APP_DIR_NAME = "BibleRoot";

/** The folder the library lived in before it moved out of the project. */
export function legacyLibraryRoot(): string {
  return path.join(process.cwd(), "data", "library");
}

/**
 * Pure so that every platform can be checked without pretending to be one.
 * Falls back sensibly whenever an environment variable is missing or empty,
 * which is common in stripped-down environments and on freshly made accounts.
 */
export function computeLibraryRoot(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
  home: string,
): string {
  // Node's `path` follows the machine this runs on, so a Windows path examined
  // on macOS is not seen as absolute and separators come out mixed. Choosing the
  // flavour from the platform argument makes the result correct for the target
  // and checkable from anywhere.
  const p = platform === "win32" ? path.win32 : path.posix;

  const override = env.BIBLEROOT_LIBRARY_DIR?.trim();
  if (override && p.isAbsolute(override)) return p.normalize(override);

  if (platform === "win32") {
    const appData = env.APPDATA?.trim();
    const base = appData && p.isAbsolute(appData) ? appData : p.join(home, "AppData", "Roaming");
    return p.join(base, APP_DIR_NAME);
  }

  if (platform === "darwin") {
    return p.join(home, "Library", "Application Support", APP_DIR_NAME);
  }

  const xdg = env.XDG_DATA_HOME?.trim();
  const base = xdg && p.isAbsolute(xdg) ? xdg : p.join(home, ".local", "share");
  return p.join(base, APP_DIR_NAME);
}

function homeDirectory(): string {
  try {
    const home = os.homedir();
    if (home && path.isAbsolute(home)) return home;
  } catch {
    // Some sandboxes have no home directory at all.
  }
  return process.cwd();
}

let migrated = false;

/**
 * Moves a library left in the old in-project folder to its proper home, once.
 *
 * Copies rather than moves, and never overwrites a file already at the
 * destination, so an interrupted run cannot lose anything: the originals stay
 * where they were until the reader deletes them.
 */
function migrateLegacyLibrary(target: string): void {
  if (migrated) return;
  migrated = true;

  const legacy = legacyLibraryRoot();
  if (path.resolve(legacy) === path.resolve(target)) return;

  try {
    for (const sub of ["terms", "notes"]) {
      const from = path.join(legacy, sub);
      if (!fs.existsSync(from)) continue;

      const files = fs.readdirSync(from).filter((file) => file.endsWith(".md"));
      if (files.length === 0) continue;

      const to = path.join(target, sub);
      fs.mkdirSync(to, { recursive: true });
      for (const file of files) {
        try {
          fs.copyFileSync(path.join(from, file), path.join(to, file), fs.constants.COPYFILE_EXCL);
        } catch {
          // Already there, or unreadable. Either way the original is untouched.
        }
      }
    }
  } catch {
    // A failed migration must not stop the app from starting.
  }
}

/**
 * The library folder, created if needed. Falls back to the old in-project
 * location if the conventional one cannot be made, so the app still works on a
 * locked-down machine.
 */
let resolved: string | null = null;

export function resolveLibraryRoot(): string {
  if (resolved) return resolved;
  const target = computeLibraryRoot(process.platform, process.env, homeDirectory());
  try {
    fs.mkdirSync(target, { recursive: true });
    migrateLegacyLibrary(target);
    resolved = target;
    return target;
  } catch {
    const fallback = legacyLibraryRoot();
    try {
      fs.mkdirSync(fallback, { recursive: true });
    } catch {
      // Nothing more to try; the caller will surface the failure.
    }
    resolved = fallback;
    return fallback;
  }
}

/** `~/Library/…` rather than `an account's Library folder` when shown on screen. */
export function displayPath(target: string): string {
  const home = homeDirectory();
  if (target === home) return "~";
  if (target.startsWith(`${home}${path.sep}`)) {
    return `~${path.sep}${target.slice(home.length + 1)}`;
  }
  return target;
}
