// Experience and levels. A task gives experience once, by how hard it is and
// how it was solved; the level is read off the total. Pure rules: no storage.
//
// The curve is sized by the first course (35 lessons of 70 to 210 experience,
// 3 720 in all when every task is solved on the first try). Its first lesson
// brings level 2, the whole course level 30, and level 100 takes about five
// courses of that size, some 185 lessons: a lesson every school day for a
// year. There is no top level.
import type { Outcome } from "./storage";

/** Experience for each point of a task solved on the first try. */
export const XP_PER_POINT = 10;
/** A task's points count as its difficulty, from 1 to this. */
export const DIFFICULTY_MAX = 5;
/** Experience from level 1 to level 2: about one lesson. */
const FIRST_STEP = 100;
/** How much more each next level costs than the one before it. */
const STEP_GROWTH = 2;
/** The level from which the cost stops growing: every level after it costs the same. */
export const STEADY_LEVEL = 100;

/** A task's difficulty, 1 to DIFFICULTY_MAX, from its points. A task without points counts as the easiest. */
export const difficultyOf = (points: number | null): number => Math.min(Math.max(Math.round(points ?? 1) || 1, 1), DIFFICULTY_MAX);

/**
 * What a task is worth for the way it ended: all of it on the first try, half
 * on the second, nothing when missed.
 */
export function taskXp(points: number | null, outcome: Outcome): number {
  if (outcome === "wrong") return 0;
  const full = difficultyOf(points) * XP_PER_POINT;
  return outcome === "first" ? full : full / 2;
}

/** Experience from a level to the next. */
const stepCost = (level: number): number => FIRST_STEP + STEP_GROWTH * (Math.min(level, STEADY_LEVEL) - 1);

/** The total experience at which a level starts. */
export function levelStart(level: number): number {
  const growing = Math.min(level, STEADY_LEVEL) - 1;
  const start = FIRST_STEP * growing + (STEP_GROWTH * growing * (growing - 1)) / 2;
  return start + Math.max(level - STEADY_LEVEL, 0) * stepCost(STEADY_LEVEL);
}

export type Standing = {
  level: number;
  total: number;
  /** Experience gained inside the current level, and what the whole level takes. */
  earned: number;
  needed: number;
  /** Experience still to go to the next level. */
  remaining: number;
};

export function standingOf(total: number): Standing {
  const steady = levelStart(STEADY_LEVEL);
  let level = 1;
  if (total >= steady) level = STEADY_LEVEL + Math.floor((total - steady) / stepCost(STEADY_LEVEL));
  else while (total >= levelStart(level + 1)) level++;
  const from = levelStart(level);
  const needed = stepCost(level);
  return { level, total, earned: total - from, needed, remaining: from + needed - total };
}

export const totalXp = (xp: Record<string, number>): number => Object.values(xp).reduce((sum, n) => sum + n, 0);
