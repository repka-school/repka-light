// Everything the site keeps between visits, under one localStorage key:
// the learner's profile, the result of each task they have finished, when
// they last practised each course, the experience those tasks gave, the
// answers of each lesson pass they are in the middle of, and their homestead.
// Nothing here leaves the browser.
//
// In the page the state is plain objects keyed by full ids (`Saved`). It is
// written in a short form (`Stored`): grouped by course, so the course slug
// is not repeated on every id, with results and passes as short lists.
import { avatarIds, frameIds } from "@/ui/pictures/set";
import type { Homestead } from "@/homestead/rules";
import { pack, unpack, type PackedHomestead } from "@/homestead/saved";
import { taskXp } from "./xp";

/** The key stays as it is; the shape of what is under it is `Stored["version"]`. */
export const STORAGE_KEY = "repka-light.v1";
export const NAME_MAX = 32;

/** How a task ended: right on the first try, right on the second, or wrong on both. */
export type Outcome = "first" | "second" | "wrong";

export type TaskResult = {
  outcome: Outcome;
  /** Ids of the options of the answer that settled the task. */
  choices: number[];
};

export type Profile = {
  name: string;
  /** An avatar id, or null until one is picked. */
  avatar: string | null;
  frame: string;
};

/** One card's answers in a lesson pass: a wrong first try, the set that settled it, and what was seen and opened. */
export type SavedEntry = {
  first: number[] | null;
  /** Whether it was right is not kept: the lesson tells it again. */
  final: number[] | null;
  seen: boolean;
  opened: boolean;
};

/**
 * A lesson pass as the learner left it, so a reload shows the same screen:
 * wrong answers and a pending second try included. `cards` is `cardsKey` of
 * the lesson's card ids when it was saved; a pass is dropped if they change.
 */
export type SavedRun = { cards: string; index: number; phase: "solving" | "summary"; entries: SavedEntry[] };

export type Saved = {
  profile: Profile;
  /** The best outcome of each finished task, by task id: what progress counts. */
  results: Record<string, TaskResult>;
  /** When the learner last settled a task of each course, ISO 8601, by course slug. */
  last: Record<string, string>;
  /** The latest pass through each lesson, by `<course>/<lesson>`. */
  runs: Record<string, SavedRun>;
  /** The experience each task has given, by task id. It only grows, and a reset keeps it. */
  xp: Record<string, number>;
  /** The homestead, once it has been changed; until then it is the starter one. A reset keeps it. */
  homestead?: Homestead;
};

/** A question as experience counts it. */
export type Scored = { id: string; points: number | null };

export const emptyProfile: Profile = { name: "", avatar: null, frame: "none" };
export const empty = (): Saved => ({ profile: { ...emptyProfile }, results: {}, last: {}, runs: {}, xp: {} });

const OUTCOMES: Outcome[] = ["first", "second", "wrong"];
const RANK: Record<Outcome, number> = { wrong: 0, second: 1, first: 2 };
const isOutcome = (value: unknown): value is Outcome => OUTCOMES.includes(value as Outcome);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const entriesOf = (value: unknown): [string, unknown][] => (isRecord(value) ? Object.entries(value) : []);
/**
 * An empty record to fill by keys read from storage or a backup file. It has
 * no prototype, so any key is stored as written: `__proto__` is one more key.
 */
const record = <T>(): Record<string, T> => Object.create(null);
const idList = (value: unknown): number[] | null => (Array.isArray(value) && value.every((c) => Number.isInteger(c)) ? (value as number[]) : null);

/** A task id or a `<course>/<lesson>` key, split into its course and the rest. */
function split(id: string): [course: string, rest: string] {
  const slash = id.indexOf("/");
  return slash < 0 ? ["", id] : [id.slice(0, slash), id.slice(slash + 1)];
}
const join = (course: string, rest: string) => (course ? `${course}/${rest}` : rest);
export const courseOf = (id: string): string => split(id)[0];

/**
 * A short fingerprint of a lesson's card ids, in order (32-bit FNV-1a, base 36):
 * enough to tell that a saved pass no longer fits the lesson.
 */
export function cardsKey(ids: string[]): string {
  const text = ids.join("\n");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}

/** A nickname as it is kept: one line, trimmed, at most NAME_MAX characters. */
export function cleanName(name: string): string {
  return Array.from(name.replace(/\s+/g, " ").trim()).slice(0, NAME_MAX).join("");
}

/** A profile made safe to use: an unknown picture or frame falls back to none. */
function cleanProfile(raw: unknown): Profile {
  const profile = { ...emptyProfile };
  if (!isRecord(raw)) return profile;
  const { name, avatar, frame } = raw as Partial<Profile>;
  if (typeof name === "string") profile.name = cleanName(name);
  if (typeof avatar === "string" && avatarIds.includes(avatar)) profile.avatar = avatar;
  if (typeof frame === "string" && frameIds.includes(frame)) profile.frame = frame;
  return profile;
}

// ---- The short form -------------------------------------------------------

export const STORED_VERSION = 2;

/** A result: the outcome's first letter, then the ids of the chosen options. */
export type PackedResult = [outcome: string, ...choices: number[]];
/** A card of a pass: 1 for seen plus 2 for opened, then the first try (0 when none) and the settling set; trailing blanks left out. */
export type PackedEntry = [flags: number, first?: number[] | 0, final?: number[]];
/** A pass: `cardsKey` of its cards, the card on screen, 1 when the summary shows, then one entry per card. */
export type PackedRun = [cards: string, index: number, summary: 0 | 1, ...entries: PackedEntry[]];
/** One course's part of the saved state; ids inside are without the `<course>/` in front. */
export type StoredCourse = { last?: string; results?: Record<string, PackedResult>; xp?: Record<string, number>; runs?: Record<string, PackedRun> };

/** The saved state as it is written. */
export type Stored = { version: typeof STORED_VERSION; profile: Profile; courses: Record<string, StoredCourse>; homestead?: PackedHomestead };

function packEntry({ first, final, seen, opened }: SavedEntry): PackedEntry {
  const flags = (seen ? 1 : 0) | (opened ? 2 : 0);
  if (final) return [flags, first ?? 0, final];
  return first ? [flags, first] : [flags];
}

export function toStored(saved: Saved): Stored {
  const courses = record<StoredCourse>();
  const course = (slug: string) => (courses[slug] ??= {});
  for (const [slug, at] of Object.entries(saved.last)) course(slug).last = at;
  for (const [id, { outcome, choices }] of Object.entries(saved.results)) {
    const [slug, rest] = split(id);
    (course(slug).results ??= record())[rest] = [outcome[0], ...choices];
  }
  for (const [id, amount] of Object.entries(saved.xp)) {
    const [slug, rest] = split(id);
    (course(slug).xp ??= record())[rest] = amount;
  }
  for (const [key, run] of Object.entries(saved.runs)) {
    const [slug, rest] = split(key);
    (course(slug).runs ??= record())[rest] = [run.cards, run.index, run.phase === "summary" ? 1 : 0, ...run.entries.map(packEntry)];
  }
  const stored: Stored = { version: STORED_VERSION, profile: saved.profile, courses };
  if (saved.homestead) stored.homestead = pack(saved.homestead);
  return stored;
}

function unpackResult(raw: unknown): TaskResult | null {
  if (!Array.isArray(raw)) return null;
  const outcome = OUTCOMES.find((o) => o[0] === raw[0]);
  return outcome ? { outcome, choices: raw.slice(1).filter((c) => Number.isInteger(c)) } : null;
}

/** A set of a stored entry: absent, a set, or malformed (`false`). */
const entrySet = (raw: unknown): number[] | null | false => (raw === undefined || raw === null || raw === 0 ? null : (idList(raw) ?? false));

function unpackEntry(raw: unknown): SavedEntry | null {
  if (!Array.isArray(raw) || !Number.isInteger(raw[0])) return null;
  const first = entrySet(raw[1]);
  const final = entrySet(raw[2]);
  if (first === false || final === false) return null;
  return { first, final, seen: (raw[0] & 1) !== 0, opened: (raw[0] & 2) !== 0 };
}

/** A stored lesson pass, or null when its shape is not one this site wrote. */
function unpackRun(raw: unknown): SavedRun | null {
  if (!Array.isArray(raw) || typeof raw[0] !== "string") return null;
  const [cards, index, summary, ...rest] = raw as unknown[];
  const entries = rest.map(unpackEntry);
  if (!entries.length || entries.some((e) => !e)) return null;
  if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= entries.length) return null;
  return { cards: cards as string, index: index as number, phase: summary === 1 ? "summary" : "solving", entries: entries as SavedEntry[] };
}

/** The short form read back and made safe to use: malformed results, passes and amounts, and things that cannot stand where they are saved, are dropped. */
export function fromStored(raw: unknown): Saved {
  if (!isRecord(raw)) return empty();
  const saved: Saved = { profile: cleanProfile(raw.profile), results: record(), last: record(), runs: record(), xp: record() };
  for (const [slug, course] of entriesOf(raw.courses)) {
    if (!isRecord(course)) continue;
    if (typeof course.last === "string" && course.last) saved.last[slug] = course.last;
    for (const [rest, packed] of entriesOf(course.results)) {
      const result = unpackResult(packed);
      if (result) saved.results[join(slug, rest)] = result;
    }
    for (const [rest, amount] of entriesOf(course.xp)) {
      if (Number.isSafeInteger(amount) && (amount as number) > 0) saved.xp[join(slug, rest)] = amount as number;
    }
    for (const [rest, packed] of entriesOf(course.runs)) {
      const run = unpackRun(packed);
      if (run) saved.runs[join(slug, rest)] = run;
    }
  }
  const home = unpack(raw.homestead);
  if (home) saved.homestead = home;
  return saved;
}

/**
 * The first shape, with every id in full, a time on every result and the card
 * ids in every pass, turned into the short one. Only the shape changes; what
 * is malformed is left for `fromStored` to drop. A course's `last` is the
 * latest time among its results. Other fields (the profile, the homestead, a
 * backup's own) pass through.
 */
export function upgradeV1({ results, runs, xp, version: _version, ...rest }: Record<string, unknown>): Record<string, unknown> {
  const courses = record<{ last?: string; results: Record<string, unknown>; xp: Record<string, unknown>; runs: Record<string, unknown> }>();
  const place = (id: string) => {
    const [slug, key] = split(id);
    return [(courses[slug] ??= { results: record(), xp: record(), runs: record() }), key] as const;
  };
  for (const [id, result] of entriesOf(results)) {
    if (!isRecord(result)) continue;
    const [course, key] = place(id);
    course.results[key] = [isOutcome(result.outcome) ? result.outcome[0] : "", ...(Array.isArray(result.choices) ? result.choices : [])];
    if (typeof result.at === "string" && result.at > (course.last ?? "")) course.last = result.at;
  }
  for (const [id, amount] of entriesOf(xp)) {
    const [course, key] = place(id);
    course.xp[key] = amount;
  }
  for (const [id, run] of entriesOf(runs)) {
    if (!isRecord(run) || !Array.isArray(run.cards) || !run.cards.every((c) => typeof c === "string") || !Array.isArray(run.entries) || run.entries.length !== run.cards.length) continue;
    const entries = run.entries.map((e) => (isRecord(e) ? [(e.seen === true ? 1 : 0) | (e.opened === true ? 2 : 0), e.first ?? 0, isRecord(e.final) ? e.final.choices : 0] : null));
    const [course, key] = place(id);
    course.runs[key] = [cardsKey(run.cards), run.index, run.phase === "summary" ? 1 : 0, ...entries];
  }
  return { ...rest, courses };
}

/** Whatever was stored, in either shape, made safe to use. */
export function sanitize(raw: unknown): Saved {
  if (!isRecord(raw)) return empty();
  return fromStored(raw.version === STORED_VERSION ? raw : upgradeV1(raw));
}

export function parse(text: string | null): Saved {
  if (!text) return empty();
  try {
    return sanitize(JSON.parse(text));
  } catch {
    return empty();
  }
}

// ---- Changes ---------------------------------------------------------------

/**
 * Records how a task ended. A better earlier outcome is kept: a task solved
 * on the first try stays solved when a later repeat goes worse.
 */
export function withResult(saved: Saved, taskId: string, result: TaskResult): Saved {
  const before = saved.results[taskId];
  if (before && RANK[before.outcome] > RANK[result.outcome]) return saved;
  return { ...saved, results: { ...saved.results, [taskId]: result } };
}

/** Marks the task's course as practised at the given time, ISO 8601, whatever the outcome. */
export const withPractice = (saved: Saved, taskId: string, at: string): Saved => ({ ...saved, last: { ...saved.last, [courseOf(taskId)]: at } });

export const withProfile = (saved: Saved, patch: Partial<Profile>): Saved => ({ ...saved, profile: cleanProfile({ ...saved.profile, ...patch }) });

/** Keeps a lesson's pass as the learner left it. */
export const withRun = (saved: Saved, key: string, run: SavedRun): Saved => ({ ...saved, runs: { ...saved.runs, [key]: run } });

/**
 * Gives each of the tasks the experience its saved result has earned and not
 * yet given: the whole of it for a first-try solve, the rest of it when a
 * second-try solve is later bettered. Experience never goes down.
 */
export function withXp(saved: Saved, tasks: Scored[]): Saved {
  let xp = saved.xp;
  for (const task of tasks) {
    const result = saved.results[task.id];
    const earned = result ? taskXp(task.points, result.outcome) : 0;
    if (earned <= (xp[task.id] ?? 0)) continue;
    if (xp === saved.xp) xp = { ...xp };
    xp[task.id] = earned;
  }
  return xp === saved.xp ? saved : { ...saved, xp };
}

/** The reset: every task result, practice time and lesson pass goes; the profile, the experience and the homestead stay. */
export const withoutResults = (saved: Saved): Saved => ({ ...saved, results: {}, last: {}, runs: {} });

/** How many of the given tasks are solved on the first try. */
export function solvedCount(results: Saved["results"], taskIds: string[]): number {
  return taskIds.filter((id) => results[id]?.outcome === "first").length;
}
