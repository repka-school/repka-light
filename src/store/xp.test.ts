import { describe, expect, it } from "vitest";
import { difficultyOf, levelStart, STEADY_LEVEL, standingOf, taskXp, totalXp } from "./xp";

describe("taskXp", () => {
  it("scales with a task's points, from 1 to 5", () => {
    expect([1, 2, 3, 4, 5].map((points) => taskXp(points, "first"))).toEqual([10, 20, 30, 40, 50]);
    expect(taskXp(9, "first")).toBe(50);
    expect(taskXp(0, "first")).toBe(10);
  });

  it("counts a task without points as the easiest", () => {
    expect(taskXp(null, "first")).toBe(10);
    expect([null, 0, 1, 3, 5, 8].map(difficultyOf)).toEqual([1, 1, 1, 3, 5, 5]);
  });

  it("gives half on the second try and nothing for a miss", () => {
    expect([1, 2, 3].map((points) => taskXp(points, "second"))).toEqual([5, 10, 15]);
    expect(taskXp(3, "wrong")).toBe(0);
  });
});

describe("levels", () => {
  it("start at level 1 with nothing", () => {
    expect(standingOf(0)).toEqual({ level: 1, total: 0, earned: 0, needed: 100, remaining: 100 });
  });

  it("each cost a little more than the one before, up to the steady level", () => {
    expect([1, 2, 3, 4, 5].map(levelStart)).toEqual([0, 100, 202, 306, 412]);
    for (let level = 2; level < STEADY_LEVEL; level++) {
      expect(levelStart(level + 1) - levelStart(level)).toBe(levelStart(level) - levelStart(level - 1) + 2);
    }
  });

  it("cost the same from the steady level on, with no top", () => {
    const steady = levelStart(STEADY_LEVEL);
    expect(steady).toBe(19602);
    expect([1, 2, 50].map((n) => levelStart(STEADY_LEVEL + n) - steady)).toEqual([298, 596, 14900]);
    expect(standingOf(steady)).toEqual({ level: 100, total: steady, earned: 0, needed: 298, remaining: 298 });
    expect(standingOf(steady + 297).level).toBe(100);
    expect(standingOf(steady + 298).level).toBe(101);
    expect(standingOf(steady + 298 * 900 + 5)).toMatchObject({ level: 1000, earned: 5, remaining: 293 });
  });

  it("change exactly at their thresholds", () => {
    for (let level = 2; level <= STEADY_LEVEL + 20; level++) {
      expect(standingOf(levelStart(level) - 1).level).toBe(level - 1);
      expect(standingOf(levelStart(level)).level).toBe(level);
    }
  });

  it("say how far the next one is", () => {
    expect(standingOf(250)).toEqual({ level: 3, total: 250, earned: 48, needed: 104, remaining: 56 });
  });
});

describe("totalXp", () => {
  it("adds up what every task gave", () => {
    expect(totalXp({})).toBe(0);
    expect(totalXp({ a: 10, b: 15 })).toBe(25);
  });
});
