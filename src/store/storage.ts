// Everything the site keeps between visits, under one localStorage key:
// the learner's profile, the result of each task they have finished, and the
// answers of each lesson pass they are in the middle of. Nothing here leaves
// the browser.
import { avatarIds, frameIds } from "@/ui/pictures/set";

export const STORAGE_KEY = "repka-light.v1";
export const NAME_MAX = 32;

/** How a task ended: right on the first try, right on the second, or wrong on both. */
export type Outcome = "first" | "second" | "wrong";

export type TaskResult = {
  outcome: Outcome;
  /** Ids of the options of the answer that settled the task. */
  choices: number[];
  /** When it was saved, ISO 8601. */
  at: string;
};

export type Profile = {
  name: string;
  /** An avatar id, or null until one is picked. */
  avatar: string | null;
  frame: string;
};

/** One card's answers in a lesson pass: a wrong first try, the answer that settled it, and what was opened. */
export type SavedEntry = {
  first: number[] | null;
  final: { choices: number[]; correct: boolean } | null;
  seen: boolean;
  opened: boolean;
};

/**
 * A lesson pass as the learner left it, so a reload shows the same screen:
 * wrong answers and a pending second try included. `cards` are the ids of
 * the lesson's cards when it was saved; a pass is dropped if they change.
 */
export type SavedRun = { cards: string[]; index: number; phase: "solving" | "summary"; entries: SavedEntry[] };

export type Saved = {
  version: 1;
  profile: Profile;
  /** The best outcome of each finished task, by task id: what progress counts. */
  results: Record<string, TaskResult>;
  /** The latest pass through each lesson, by `<course>/<lesson>`. */
  runs: Record<string, SavedRun>;
};

export const emptyProfile: Profile = { name: "", avatar: null, frame: "none" };
export const empty = (): Saved => ({ version: 1, profile: { ...emptyProfile }, results: {}, runs: {} });

const RANK: Record<Outcome, number> = { wrong: 0, second: 1, first: 2 };
const isOutcome = (value: unknown): value is Outcome => value === "first" || value === "second" || value === "wrong";

/** A nickname as it is kept: one line, trimmed, at most NAME_MAX characters. */
export function cleanName(name: string): string {
  return Array.from(name.replace(/\s+/g, " ").trim()).slice(0, NAME_MAX).join("");
}

const idList = (value: unknown): number[] | null => (Array.isArray(value) && value.every((c) => Number.isInteger(c)) ? (value as number[]) : null);

/** A stored lesson pass, or null when its shape is not one this site wrote. */
function cleanRun(raw: unknown): SavedRun | null {
  if (!raw || typeof raw !== "object") return null;
  const { cards, index, phase, entries } = raw as Partial<SavedRun>;
  if (!Array.isArray(cards) || !cards.every((id) => typeof id === "string")) return null;
  if (!Array.isArray(entries) || entries.length !== cards.length) return null;
  if (!Number.isInteger(index) || index! < 0 || index! >= cards.length) return null;
  const clean: SavedEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") return null;
    const first = entry.first === null || entry.first === undefined ? null : idList(entry.first);
    const final = entry.final ? idList(entry.final.choices) : null;
    if ((entry.first && !first) || (entry.final && !final)) return null;
    clean.push({ first, final: final ? { choices: final, correct: entry.final!.correct === true } : null, seen: entry.seen === true, opened: entry.opened === true });
  }
  return { cards, index: index!, phase: phase === "summary" ? "summary" : "solving", entries: clean };
}

/** Whatever was stored, made safe to use: unknown ids, malformed results and malformed passes are dropped. */
export function sanitize(raw: unknown): Saved {
  const saved = empty();
  if (!raw || typeof raw !== "object") return saved;
  const { profile, results, runs } = raw as { profile?: Partial<Profile>; results?: Record<string, Partial<TaskResult>>; runs?: Record<string, unknown> };
  if (profile && typeof profile === "object") {
    if (typeof profile.name === "string") saved.profile.name = cleanName(profile.name);
    if (typeof profile.avatar === "string" && avatarIds.includes(profile.avatar)) saved.profile.avatar = profile.avatar;
    if (typeof profile.frame === "string" && frameIds.includes(profile.frame)) saved.profile.frame = profile.frame;
  }
  if (results && typeof results === "object") {
    for (const [id, result] of Object.entries(results)) {
      if (!result || !isOutcome(result.outcome)) continue;
      const choices = Array.isArray(result.choices) ? result.choices.filter((c) => Number.isInteger(c)) : [];
      saved.results[id] = { outcome: result.outcome, choices, at: typeof result.at === "string" ? result.at : "" };
    }
  }
  if (runs && typeof runs === "object") {
    for (const [key, run] of Object.entries(runs)) {
      const clean = cleanRun(run);
      if (clean) saved.runs[key] = clean;
    }
  }
  return saved;
}

export function parse(text: string | null): Saved {
  if (!text) return empty();
  try {
    return sanitize(JSON.parse(text));
  } catch {
    return empty();
  }
}

/**
 * Records how a task ended. A better earlier outcome is kept: a task solved
 * on the first try stays solved when a later repeat goes worse.
 */
export function withResult(saved: Saved, taskId: string, result: TaskResult): Saved {
  const before = saved.results[taskId];
  if (before && RANK[before.outcome] > RANK[result.outcome]) return saved;
  return { ...saved, results: { ...saved.results, [taskId]: result } };
}

export function withProfile(saved: Saved, patch: Partial<Profile>): Saved {
  return sanitize({ ...saved, profile: { ...saved.profile, ...patch } });
}

/** Keeps a lesson's pass as the learner left it. */
export const withRun = (saved: Saved, key: string, run: SavedRun): Saved => ({ ...saved, runs: { ...saved.runs, [key]: run } });

/** The reset: every task result and every lesson pass goes; the profile stays. */
export const withoutResults = (saved: Saved): Saved => ({ ...saved, results: {}, runs: {} });

/** How many of the given tasks are solved on the first try. */
export function solvedCount(results: Saved["results"], taskIds: string[]): number {
  return taskIds.filter((id) => results[id]?.outcome === "first").length;
}
