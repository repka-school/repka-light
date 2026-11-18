import { describe, expect, it } from "vitest";
import { cleanName, empty, parse, sanitize, solvedCount, withoutResults, withProfile, withResult, withRun, withXp, type SavedRun, type TaskResult } from "./storage";

const result = (outcome: TaskResult["outcome"], choices = [1]): TaskResult => ({ outcome, choices, at: "2026-01-01T00:00:00.000Z" });

describe("parse", () => {
  it("starts empty when nothing is stored or the text is not JSON", () => {
    expect(parse(null)).toEqual(empty());
    expect(parse("{not json")).toEqual(empty());
    expect(parse("42")).toEqual(empty());
  });

  it("drops unknown pictures and malformed results, keeping the rest", () => {
    const saved = sanitize({
      profile: { name: "  Маша   К. ", avatar: "dragon", frame: "sea" },
      results: { a: { outcome: "first", choices: [2, "x"], at: "t" }, b: { outcome: "great" }, c: null },
    });
    expect(saved.profile).toEqual({ name: "Маша К.", avatar: null, frame: "sea" });
    expect(saved.results).toEqual({ a: { outcome: "first", choices: [2], at: "t" } });
  });

  it("round-trips what it wrote", () => {
    const saved = withResult(withProfile(empty(), { name: "Петя", avatar: "kitten", frame: "stars" }), "p/t", result("second", [3]));
    expect(parse(JSON.stringify(saved))).toEqual(saved);
  });
});

describe("cleanName", () => {
  it("keeps one line of at most 32 characters", () => {
    expect(cleanName(" a\n b ")).toBe("a b");
    expect(Array.from(cleanName("я".repeat(40)))).toHaveLength(32);
  });
});

describe("withResult", () => {
  it("records a task's first result", () => {
    expect(withResult(empty(), "t", result("wrong")).results.t.outcome).toBe("wrong");
  });

  it("lets a better outcome replace a worse one", () => {
    const saved = withResult(withResult(empty(), "t", result("wrong")), "t", result("first", [4]));
    expect(saved.results.t).toMatchObject({ outcome: "first", choices: [4] });
  });

  it("keeps a task solved when a repeat goes worse", () => {
    const solved = withResult(empty(), "t", result("first", [4]));
    expect(withResult(solved, "t", result("wrong", [1]))).toBe(solved);
    expect(withResult(solved, "t", result("second", [4]))).toBe(solved);
  });
});

describe("progress", () => {
  it("counts only tasks solved on the first try", () => {
    const { results } = [["a", "first"], ["b", "second"], ["c", "wrong"]].reduce((saved, [id, outcome]) => withResult(saved, id, result(outcome as TaskResult["outcome"])), empty());
    expect(solvedCount(results, ["a", "b", "c", "d"])).toBe(1);
  });

  it("resets results and keeps the profile", () => {
    const saved = withResult(withProfile(empty(), { name: "Петя" }), "t", result("first"));
    expect(withoutResults(saved)).toEqual({ version: 1, profile: saved.profile, results: {}, runs: {}, xp: {} });
  });
});

describe("experience", () => {
  const easy = { id: "a", points: 1 };
  const hard = { id: "b", points: 3 };
  const solve = (saved = empty(), id: string, outcome: TaskResult["outcome"]) => withResult(saved, id, result(outcome));

  it("is given for each task by its points and how it ended", () => {
    const saved = solve(solve(solve(empty(), "a", "first"), "b", "second"), "c", "wrong");
    expect(withXp(saved, [easy, hard, { id: "c", points: 2 }, { id: "d", points: 2 }]).xp).toEqual({ a: 10, b: 15 });
  });

  it("is topped up when a task is later solved better, and given once", () => {
    const second = withXp(solve(empty(), "b", "second"), [hard]);
    const first = withXp(solve(second, "b", "first"), [hard]);
    expect(first.xp).toEqual({ b: 30 });
    expect(withXp(first, [hard])).toBe(first);
  });

  it("never goes down when a task's points do", () => {
    const saved = withXp(solve(empty(), "b", "first"), [hard]);
    expect(withXp(saved, [{ id: "b", points: 1 }])).toBe(saved);
  });

  it("stays after a reset and is not given again", () => {
    const reset = withoutResults(withXp(solve(empty(), "a", "first"), [easy]));
    expect(reset.xp).toEqual({ a: 10 });
    expect(withXp(solve(reset, "a", "first"), [easy]).xp).toEqual({ a: 10 });
  });

  it("round-trips, and drops amounts that are not whole and positive", () => {
    expect(parse(JSON.stringify({ xp: { a: 10, b: 2.5, c: -5, d: "20", e: 0 } })).xp).toEqual({ a: 10 });
  });

  it("reads data saved before experience was counted", () => {
    expect(parse(JSON.stringify({ version: 1, profile: {}, results: {}, runs: {} })).xp).toEqual({});
  });
});

describe("lesson passes", () => {
  const run: SavedRun = {
    cards: ["th", "q1"],
    index: 1,
    phase: "solving",
    entries: [
      { first: null, final: null, seen: true, opened: false },
      { first: [1], final: null, seen: false, opened: true },
    ],
  };

  it("round-trip, and go with the reset", () => {
    const saved = withRun(empty(), "c/l", run);
    expect(parse(JSON.stringify(saved)).runs).toEqual({ "c/l": run });
    expect(withoutResults(saved).runs).toEqual({});
  });

  it("survive a profile change", () => {
    expect(withProfile(withRun(empty(), "c/l", run), { name: "Петя" }).runs).toEqual({ "c/l": run });
  });

  it("are dropped when malformed, without touching the rest", () => {
    const saved = sanitize({
      results: { a: { outcome: "first", choices: [1], at: "t" } },
      runs: {
        good: run,
        short: { ...run, entries: run.entries.slice(0, 1) },
        index: { ...run, index: 5 },
        ids: { ...run, entries: [run.entries[0], { ...run.entries[1], first: ["x"] }] },
        text: "nope",
      },
    });
    expect(Object.keys(saved.runs)).toEqual(["good"]);
    expect(Object.keys(saved.results)).toEqual(["a"]);
  });

  it("read data saved before passes were kept", () => {
    expect(parse(JSON.stringify({ version: 1, profile: { name: "Петя", avatar: null, frame: "none" }, results: {} })).runs).toEqual({});
  });
});
