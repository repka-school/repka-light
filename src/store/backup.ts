// The saved state as a file the learner keeps: downloaded from one browser,
// loaded into another. The file has its own version, apart from the storage
// key's: a file written by an older site is upgraded step by step on import,
// and one written by a newer site is refused rather than half-read.
import { sanitize, type Saved } from "./storage";

export const BACKUP_FORMAT = "repka-light-backup";
export const BACKUP_VERSION = 2;
/** A real backup is a few hundred kilobytes at most; anything far larger is not one. */
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** When it was downloaded, ISO 8601. */
  exportedAt: string;
  profile: Saved["profile"];
  results: Saved["results"];
  runs: Saved["runs"];
  xp: Saved["xp"];
};

/**
 * Upgrades from each older version to the next: `upgrades[n]` turns a version
 * n file into a version n + 1 one. A change to the file's shape bumps
 * BACKUP_VERSION and adds a step here, so every file ever written still loads.
 */
const upgrades: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {
  // Version 1 had no experience. Its results earn theirs when their course is next opened.
  1: (old) => ({ ...old, xp: {} }),
};

export type ImportError = "notJson" | "notBackup" | "tooNew" | "tooLarge";
export type ImportResult = { ok: true; saved: Saved; exportedAt: string } | { ok: false; error: ImportError };

export function toBackup(saved: Saved, now = new Date()): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), profile: saved.profile, results: saved.results, runs: saved.runs, xp: saved.xp };
}

/** The file's name: the site and the day, so several downloads sort by date. */
export const backupFileName = (now = new Date()) => `repka-progress-${now.toISOString().slice(0, 10)}.json`;

export function fromBackup(text: string): ImportResult {
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: "tooLarge" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "notJson" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "notBackup" };
  let file = raw as Record<string, unknown>;
  const version = file.version;
  if (file.format !== BACKUP_FORMAT || !Number.isInteger(version) || (version as number) < 1) return { ok: false, error: "notBackup" };
  if ((version as number) > BACKUP_VERSION) return { ok: false, error: "tooNew" };
  for (let v = version as number; v < BACKUP_VERSION; v++) file = upgrades[v](file);
  return { ok: true, saved: sanitize(file), exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : "" };
}
