import { useSyncExternalStore } from "react";
import { dayOf, freeXp, starter, type Homestead } from "@/homestead/rules";
import { drillPaidOn, parse, STORAGE_KEY, toStored, withoutResults, withDrillResult, withPractice, withProfile, withResult, withXp, type Outcome, type Profile, type Saved, type Scored } from "./storage";
import { standingOf, totalXp } from "./xp";
import { withWriteLock } from "./writeLock";

// One copy of the saved state for the page, written through to localStorage.
// A browser that refuses storage (private mode, a full quota) still works:
// the state then lasts until the page is closed.

function readRaw(): string | null | undefined {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return undefined;
  }
}

let raw = readRaw();
let state = parse(raw ?? null);
let visible = state;
let memoryOnly = raw === undefined;
const listeners = new Set<() => void>();
type Change = (saved: Saved) => Saved;
const pending = new Set<{ change: Change; immediate: boolean; durableOnly: boolean }>();
// Reapply unsaved practice to a newer snapshot if another tab writes before
// this one recovers. Clear the changes only after a successful durable write.
const unsaved: Change[] = [];

function reconcile(stored: string | null | undefined) {
  if (stored === undefined || stored === raw) return state;
  raw = stored;
  return unsaved.reduce((saved, change) => change(saved), parse(stored));
}

function notify(statusChanged = false) {
  let next = state;
  for (const action of pending) if (action.immediate) next = action.change(next);
  if (next === visible && !statusChanged) return;
  visible = next;
  listeners.forEach((listener) => listener());
}

function commit(change: Change, { immediate = false, durableOnly = false } = {}) {
  const action = { change, immediate, durableOnly };
  pending.add(action);
  const write = withWriteLock((persistent) => {
    pending.delete(action);
    const stored = persistent ? readRaw() : undefined;
    const before = reconcile(stored);
    const after = change(before);
    const previousStatus = memoryOnly;
    let persisted = stored !== undefined;
    if (persisted && (after !== before || unsaved.length || (durableOnly && memoryOnly))) {
      try {
        const text = JSON.stringify(toStored(after));
        window.localStorage.setItem(STORAGE_KEY, text);
        raw = text;
        unsaved.length = 0;
        memoryOnly = false;
      } catch {
        persisted = false;
      }
    }
    if (!persisted) {
      memoryOnly = true;
      if (!durableOnly && after !== before) unsaved.push(change);
    }
    state = persisted || !durableOnly ? after : before;
    notify(previousStatus !== memoryOnly);
    return { before, after: state, persisted };
  });
  if (immediate) notify();
  return write;
}

// Another tab of the site changed the saved state.
window.addEventListener("storage", (event) => {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  const stored = readRaw();
  if (stored === undefined || stored === raw) return;
  state = reconcile(stored);
  notify();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// An event handler can read its own queued changes before the lock is granted.
export const getSaved = () => {
  let snapshot = state;
  for (const { change, durableOnly } of pending) if (!durableOnly) snapshot = change(snapshot);
  return snapshot;
};
export const useSaved = () => useSyncExternalStore(subscribe, () => visible);
export const isMemoryOnly = () => memoryOnly;
export const useMemoryOnly = () => useSyncExternalStore(subscribe, isMemoryOnly);

/** Settle the answer, update the pass, and award its XP in the same write. */
export async function saveResult(task: Scored, outcome: Outcome, choices: number[], step?: Change) {
  const at = new Date().toISOString();
  const { before, after } = await commit((saved) => {
    const pass = step ? step(saved) : saved;
    const result = withResult(pass, task.id, { outcome, choices });
    return withXp(withPractice(result, task.id, at), [task]);
  });
  const gained = (after.xp[task.id] ?? 0) - (before.xp[task.id] ?? 0);
  const total = totalXp(after.xp);
  const level = standingOf(total).level;
  return { gained, level: level > standingOf(total - gained).level ? level : null };
}
/** Gives the experience of results saved earlier that have none yet: from before experience was counted, or from an older backup file. */
export async function grantXp(tasks: Scored[]) {
  await commit((saved) => withXp(saved, tasks));
}
/** What saving a timed game changed: the best result before it, what the game had already given today, and the experience this game added. */
export type DrillSaved = { previous?: { score: number; tenths?: number }; paidToday: number; gained: number };

export async function saveDrillResult(id: string, score: number, tenths: number): Promise<DrillSaved> {
  const now = new Date();
  const day = dayOf(now);
  const { before, after } = await commit((saved) => withDrillResult(saved, id, score, tenths, now.toISOString(), day));
  const previousScore = before.drills?.[id];
  return {
    previous: previousScore === undefined ? undefined : { score: previousScore, tenths: before.bestAnswerTimeTenths?.[id] },
    paidToday: drillPaidOn(before, id, day),
    gained: (after.xp[id] ?? 0) - (before.xp[id] ?? 0),
  };
}
export async function saveProfile(patch: Partial<Profile>) {
  await commit((saved) => withProfile(saved, patch));
}
export async function saveRun(step: Change) {
  await commit(step);
}
export async function resetProgress() {
  return (await commit(withoutResults, { durableOnly: true })).persisted;
}
/** An imported backup: it takes the place of everything saved in this browser. */
export async function replaceSaved(next: Saved) {
  return (await commit(() => next, { durableOnly: true })).persisted;
}

const STARTER = starter();
/** The homestead as saved, or the starter one while nothing in it has been changed. */
export const homesteadOf = (saved: Saved): Homestead => saved.homestead ?? STARTER;
/** The experience free to spend in the homestead: what was earned less what was spent there. */
export const freeXpOf = (saved: Saved): number => freeXp(homesteadOf(saved), totalXp(saved.xp));
export async function saveHomestead(homestead: Homestead) {
  // The scene uses its updated inventory during the same input event.
  await commit((saved) => ({ ...saved, homestead }), { immediate: true });
}
