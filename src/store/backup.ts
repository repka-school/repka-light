// The saved state as a file the learner keeps: downloaded from one browser,
// loaded into another. The file has its own version, apart from the storage
// key's: a file written by an older site is upgraded step by step on import,
// and one written by a newer site is refused rather than half-read.
import { fromStored, toStored, upgradeV1, type Saved, type Stored } from "./storage";

export const BACKUP_FORMAT = "repka-light-backup";
export const BACKUP_VERSION = 8;
/** A real backup is a few hundred kilobytes at most; anything far larger is not one. */
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

/** The file: its own mark, version and date, then the saved state in the short form it has in the browser. */
export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** When it was downloaded, ISO 8601. */
  exportedAt: string;
} & Omit<Stored, "version">;

/**
 * Upgrades from each older version to the next: `upgrades[n]` turns a version
 * n file into a version n + 1 one. A change to the file's shape bumps
 * BACKUP_VERSION and adds a step here, so every file ever written still loads.
 */
const upgrades: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {
  // Version 1 had no experience. Its results earn theirs when their course is next opened.
  1: (old) => ({ ...old, xp: {} }),
  // Version 2 had no homestead. It starts as the starter one, with all the experience free to spend.
  2: ({ homestead: _none, ...old }) => old,
  // Version 3 had every id in full, a time on every result and the card ids in every pass.
  3: upgradeV1,
  // Version 4 had no saved game scores. The new field is optional.
  4: (old) => old,
  // Version 5 kept drill scores without completion times.
  5: (old) => old,
  // Version 6 recorded wall-clock times. The new reader only loads answer-time records.
  6: (old) => old,
  // Version 7 did not keep what each game gave on its last day. The new field is optional.
  7: (old) => old,
};

export type ImportError = "notJson" | "notBackup" | "tooNew" | "tooLarge";
export type ImportResult = { ok: true; saved: Saved; exportedAt: string } | { ok: false; error: ImportError };

export function toBackup(saved: Saved, now = new Date()): Backup {
  const { version: _stored, ...stored } = toStored(saved);
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...stored };
}

/** The file's name: the site, the day and the time (local, HH-MM), so several downloads sort by date. */
export const backupFileName = (now = new Date()) => {
  const two = (n: number) => String(n).padStart(2, "0");
  const day = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  return `repka-progress-${day}-${two(now.getHours())}${two(now.getMinutes())}.json`;
};

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
  return { ok: true, saved: fromStored(file), exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : "" };
}
