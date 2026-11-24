// The saved state as a file the learner keeps: downloaded from one browser,
// loaded into another. The file has its own version, apart from the storage
// key's: a file written by an older site is upgraded step by step on import,
// and one written by a newer site is refused rather than half-read.
import { fromStored, isDay, isDraft, isDrillScore, isDrillTime, isRecord, toStored, upgradeV1, type Saved, type Stored } from "./storage";

export const BACKUP_FORMAT = "repka-light-backup";
export const BACKUP_VERSION = 9;
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
  // Version 8 kept checked answers only. A draft is an optional fourth entry field.
  8: (old) => old,
};

export type ImportError = "unreadable" | "notJson" | "notBackup" | "tooNew" | "tooLarge";
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

type Validator = (value: unknown) => boolean;
const mapOf = (value: unknown, valid: Validator) => isRecord(value) && Object.values(value).every(valid);
const choices: Validator = (value) => Array.isArray(value) && value.every(Number.isInteger);
const amount: Validator = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const indexIn = (index: unknown, length: number) => typeof index === "number" && Number.isInteger(index) && index >= 0 && index < length;

function legacyRun(run: unknown) {
  return isRecord(run) && Array.isArray(run.cards) && run.cards.every((id) => typeof id === "string")
    && Array.isArray(run.entries) && run.entries.length === run.cards.length && indexIn(run.index, run.entries.length)
    && (run.phase === "summary" || run.phase === "solving") && run.entries.every((entry) =>
      isRecord(entry) && (entry.first === null || choices(entry.first)) &&
      (entry.final === null || (isRecord(entry.final) && choices(entry.final.choices) && typeof entry.final.correct === "boolean")) &&
      typeof entry.seen === "boolean" && typeof entry.opened === "boolean");
}

function packedEntry(entry: unknown, version: number) {
  if (!Array.isArray(entry) || !indexIn(entry[0], 4)) return false;
  if (entry.length >= 2 && entry[1] !== 0 && !choices(entry[1])) return false;
  if (entry.length < 3) return true;
  if (entry.length === 3) return choices(entry[2]);
  return version >= 9 && entry.length === 4 && entry[2] === 0 && isDraft(entry[3]);
}

function packedRun(run: unknown, version: number) {
  return Array.isArray(run) && typeof run[0] === "string" && indexIn(run[1], run.length - 3)
    && (run[2] === 0 || run[2] === 1) && run.slice(3).every((entry) => packedEntry(entry, version));
}

const courseFields: Record<string, Validator> = {
  results: (r) => Array.isArray(r) && ["f", "s", "w"].includes(r[0]) && r.slice(1).every(Number.isInteger),
  xp: amount, drills: isDrillScore, bestAnswerTimeTenths: isDrillTime, drillBestTenths: isDrillTime,
  drillDays: (r) => Array.isArray(r) && r.length === 2 && isDay(r[0]) && isDrillScore(r[1]) && r[1] > 0,
};

// A restore replaces the learner's only local copy. A malformed container must
// fail here, before an upgrade or the forgiving localStorage reader drops it.
function validPayload(file: Record<string, unknown>, version: number) {
  const p = file.profile;
  if (!isRecord(p) || (p.name !== undefined && typeof p.name !== "string") ||
      (p.avatar !== undefined && p.avatar !== null && typeof p.avatar !== "string") ||
      (p.frame !== undefined && typeof p.frame !== "string")) return false;
  if (version >= 3 && file.homestead !== undefined && !isRecord(file.homestead)) return false;
  if (version < 4) {
    return mapOf(file.results, (r) => isRecord(r) && choices(r.choices) &&
      (r.outcome === "first" || r.outcome === "second" || r.outcome === "wrong") && typeof r.at === "string")
      && mapOf(file.runs, legacyRun) && (version === 1 || mapOf(file.xp, amount));
  }
  return mapOf(file.courses, (course) => isRecord(course) && Object.entries(course).every(([key, value]) => {
    if (key === "last") return typeof value === "string";
    if (key === "runs") return mapOf(value, (run) => packedRun(run, version));
    return Object.hasOwn(courseFields, key) && mapOf(value, courseFields[key]);
  }));
}

export async function readBackup(file: Pick<File, "size" | "text">): Promise<ImportResult> {
  if (file.size > BACKUP_MAX_BYTES) return { ok: false, error: "tooLarge" };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "unreadable" };
  }
  return fromBackup(text);
}

export function fromBackup(text: string): ImportResult {
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: "tooLarge" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "notJson" };
  }
  if (!isRecord(raw)) return { ok: false, error: "notBackup" };
  let file = raw;
  const version = file.version;
  if (file.format !== BACKUP_FORMAT || typeof version !== "number" || !Number.isInteger(version) || version < 1) return { ok: false, error: "notBackup" };
  if (version > BACKUP_VERSION) return { ok: false, error: "tooNew" };
  if (!validPayload(file, version)) return { ok: false, error: "notBackup" };
  for (let v = version; v < BACKUP_VERSION; v++) file = upgrades[v](file);
  return { ok: true, saved: fromStored(file), exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : "" };
}
