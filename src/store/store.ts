import { useSyncExternalStore } from "react";
import { empty, parse, STORAGE_KEY, withoutResults, withProfile, withResult, withRun, withXp, type Outcome, type Profile, type Saved, type SavedRun, type Scored } from "./storage";
import { totalXp } from "./xp";

// One copy of the saved state for the page, written through to localStorage.
// A browser that refuses storage (private mode, a full quota) still works:
// the state then lasts until the page is closed.

function read(): Saved {
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return empty();
  }
}

let state: Saved = read();
const listeners = new Set<() => void>();

function commit(next: Saved) {
  if (next === state) return;
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Kept in memory only.
  }
  listeners.forEach((listener) => listener());
}

// Another tab of the site changed the saved state.
window.addEventListener("storage", (event) => {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  state = read();
  listeners.forEach((listener) => listener());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSaved = () => state;
export const useSaved = () => useSyncExternalStore(subscribe, getSaved);

/** Saves how a task ended and gives its experience; returns how much experience that added. */
export function saveResult(task: Scored, outcome: Outcome, choices: number[]): number {
  const before = totalXp(state.xp);
  commit(withXp(withResult(state, task.id, { outcome, choices, at: new Date().toISOString() }), [task]));
  return totalXp(state.xp) - before;
}
/** Gives the experience of results saved earlier that have none yet: from before experience was counted, or from an older backup file. */
export const grantXp = (tasks: Scored[]) => commit(withXp(state, tasks));
export const saveProfile = (patch: Partial<Profile>) => commit(withProfile(state, patch));
export const saveRun = (key: string, run: SavedRun) => commit(withRun(state, key, run));
export const resetProgress = () => commit(withoutResults(state));
/** An imported backup: it takes the place of everything saved in this browser. */
export const replaceSaved = (next: Saved) => commit(next);
