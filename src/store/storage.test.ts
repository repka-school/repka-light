import { describe, expect, it } from "vitest";
import { apply, starter } from "@/homestead/rules";
import { cardsKey, cleanName, empty, parse, sanitize, solvedCount, toStored, withoutResults, withPractice, withProfile, withResult, withRun, withXp, type Saved, type SavedRun, type TaskResult } from "./storage";

const result = (outcome: TaskResult["outcome"], choices = [1]): TaskResult => ({ outcome, choices });
/** The text the browser keeps for a saved state. */
const written = (saved: Saved) => JSON.stringify(toStored(saved));

describe("parse", () => {
  it("starts empty when nothing is stored or the text is not JSON", () => {
    expect(parse(null)).toEqual(empty());
    expect(parse("{not json")).toEqual(empty());
    expect(parse("42")).toEqual(empty());
  });

  it("drops unknown pictures and malformed results, keeping the rest", () => {
    const saved = sanitize({
      version: 2,
      profile: { name: "  Маша   К. ", avatar: "dragon", frame: "sea" },
      courses: { c: { results: { a: ["f", 2, "x"], b: ["g"], c: null, d: "f" } }, e: "nope" },
    });
    expect(saved.profile).toEqual({ name: "Маша К.", avatar: null, frame: "sea" });
    expect(saved.results).toEqual({ "c/a": { outcome: "first", choices: [2] } });
  });

  it("round-trips what it wrote", () => {
    const saved = withPractice(withResult(withProfile(empty(), { name: "Петя", avatar: "kitten", frame: "stars" }), "p/l/t", result("second", [3])), "p/l/t", "2026-01-01T00:00:00.000Z");
    expect(parse(written(saved))).toEqual(saved);
  });
});

describe("the short form", () => {
  it("groups by course, without the course in each id", () => {
    const saved = withXp(withPractice(withResult(empty(), "math-2/sets/both", result("first", [1, 3])), "math-2/sets/both", "2026-01-02T03:04:05.000Z"), [{ id: "math-2/sets/both", points: 1 }]);
    expect(toStored(saved)).toEqual({
      version: 2,
      profile: saved.profile,
      courses: { "math-2": { last: "2026-01-02T03:04:05.000Z", results: { "sets/both": ["f", 1, 3] }, xp: { "sets/both": 10 } } },
    });
  });

  it("writes a pass as a short list, blanks left out", () => {
    const run: SavedRun = {
      cards: cardsKey(["th", "q1", "q2", "q3"]),
      index: 2,
      phase: "solving",
      entries: [
        { first: null, final: null, seen: true, opened: false },
        { first: [1], final: [2], seen: false, opened: true },
        { first: [4], final: null, seen: false, opened: false },
        { first: null, final: [1], seen: false, opened: false },
      ],
    };
    expect(toStored(withRun(empty(), "c/l", run)).courses.c.runs).toEqual({ l: [run.cards, 2, 0, [1], [2, [1], [2]], [0, [4]], [0, 0, [1]]] });
  });
});

describe("the first shape", () => {
  const v1 = {
    version: 1,
    profile: { name: "Маша", avatar: null, frame: "none" },
    results: {
      "a/l/1": { outcome: "first", choices: [2], at: "2026-01-01T10:00:00.000Z" },
      "a/l/2": { outcome: "wrong", choices: [1], at: "2026-01-03T10:00:00.000Z" },
      "b/l/1": { outcome: "second", choices: [1, 3], at: "2026-01-02T10:00:00.000Z" },
    },
    runs: {
      "a/l": { cards: ["th", "1"], index: 1, phase: "summary", entries: [{ first: null, final: null, seen: true, opened: false }, { first: [1], final: { choices: [2], correct: true }, seen: false, opened: true }] },
    },
    xp: { "a/l/1": 10 },
  };

  it("is read into the same state, the latest time of each course kept", () => {
    expect(sanitize(v1)).toEqual({
      profile: v1.profile,
      results: { "a/l/1": result("first", [2]), "a/l/2": result("wrong", [1]), "b/l/1": result("second", [1, 3]) },
      last: { a: "2026-01-03T10:00:00.000Z", b: "2026-01-02T10:00:00.000Z" },
      runs: {
        "a/l": { cards: cardsKey(["th", "1"]), index: 1, phase: "summary", entries: [{ first: null, final: null, seen: true, opened: false }, { first: [1], final: [2], seen: false, opened: true }] },
      },
      xp: { "a/l/1": 10 },
    });
  });

  it("is read without a version, as the site wrote it before it had one", () => {
    const { version: _v, ...unversioned } = v1;
    expect(sanitize(unversioned)).toEqual(sanitize(v1));
  });

  it("comes out shorter, even this small", () => {
    expect(written(sanitize(v1)).length).toBeLessThan(JSON.stringify(v1).length * 0.6);
  });
});

describe("cleanName", () => {
  it("keeps one line of at most 32 characters", () => {
    expect(cleanName(" a\n b ")).toBe("a b");
    expect(Array.from(cleanName("я".repeat(40)))).toHaveLength(32);
  });
});

describe("cardsKey", () => {
  it("is short, and changes with the cards and their order", () => {
    const key = cardsKey(["th", "q1", "q2"]);
    expect(key.length).toBeLessThanOrEqual(7);
    expect(cardsKey(["th", "q1", "q2"])).toBe(key);
    expect(cardsKey(["th", "q2", "q1"])).not.toBe(key);
    expect(cardsKey(["th", "q1"])).not.toBe(key);
    expect(cardsKey(["th", "q1q2"])).not.toBe(cardsKey(["th", "q1", "q2"]));
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

describe("withPractice", () => {
  it("marks the task's course with the time", () => {
    const saved = withPractice(withPractice(empty(), "a/l/1", "2026-01-01T00:00:00.000Z"), "b/l/1", "2026-01-02T00:00:00.000Z");
    expect(withPractice(saved, "a/m/2", "2026-01-03T00:00:00.000Z").last).toEqual({ a: "2026-01-03T00:00:00.000Z", b: "2026-01-02T00:00:00.000Z" });
  });
});

describe("progress", () => {
  it("counts only tasks solved on the first try", () => {
    const { results } = [["a", "first"], ["b", "second"], ["c", "wrong"]].reduce((saved, [id, outcome]) => withResult(saved, id, result(outcome as TaskResult["outcome"])), empty());
    expect(solvedCount(results, ["a", "b", "c", "d"])).toBe(1);
  });

  it("resets results and practice times, and keeps the profile", () => {
    const saved = withPractice(withResult(withProfile(empty(), { name: "Петя" }), "c/t", result("first")), "c/t", "2026-01-01T00:00:00.000Z");
    expect(withoutResults(saved)).toEqual({ profile: saved.profile, results: {}, last: {}, runs: {}, xp: {} });
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
    expect(parse(JSON.stringify({ version: 2, courses: { c: { xp: { a: 10, b: 2.5, c: -5, d: "20", e: 0 } } } })).xp).toEqual({ "c/a": 10 });
  });

  it("reads data saved before experience was counted", () => {
    expect(parse(JSON.stringify({ version: 1, profile: {}, results: {}, runs: {} })).xp).toEqual({});
  });
});

describe("lesson passes", () => {
  const run: SavedRun = {
    cards: cardsKey(["th", "q1"]),
    index: 1,
    phase: "solving",
    entries: [
      { first: null, final: null, seen: true, opened: false },
      { first: [1], final: null, seen: false, opened: true },
    ],
  };

  it("round-trip, and go with the reset", () => {
    const saved = withRun(empty(), "c/l", run);
    expect(parse(written(saved)).runs).toEqual({ "c/l": run });
    expect(withoutResults(saved).runs).toEqual({});
  });

  it("survive a profile change", () => {
    expect(withProfile(withRun(empty(), "c/l", run), { name: "Петя" }).runs).toEqual({ "c/l": run });
  });

  it("are dropped when malformed, without touching the rest", () => {
    const good = toStored(withRun(empty(), "c/l", run)).courses.c.runs!.l;
    const saved = sanitize({
      version: 2,
      courses: {
        c: {
          results: { a: ["f", 1] },
          runs: {
            good,
            empty: [good[0], 0, 0],
            index: [good[0], 5, 0, ...good.slice(3)],
            ids: [good[0], 1, 0, [1], [0, ["x"]]],
            entry: [good[0], 1, 0, [1], "x"],
            key: [7, 1, 0, [1], [0]],
            text: "nope",
          },
        },
      },
    });
    expect(Object.keys(saved.runs)).toEqual(["c/good"]);
    expect(Object.keys(saved.results)).toEqual(["c/a"]);
  });

  it("read data saved before passes were kept", () => {
    expect(parse(JSON.stringify({ version: 1, profile: { name: "Петя", avatar: null, frame: "none" }, results: {} })).runs).toEqual({});
  });
});

describe("the homestead", () => {
  /** A saved state whose homestead has a seed bought and planted. */
  function planted(): Saved {
    const bought = apply(starter(), { action: "buy", seed: "rare" }, 100, "2026-03-04");
    const home = bought.ok ? apply(bought.home, { action: "plant", at: [2, 5], seed: "rare" }, 100, "2026-03-04") : bought;
    if (!home.ok) throw new Error(home.reason);
    return { ...withXp(withResult(empty(), "c/t", result("first")), [{ id: "c/t", points: 5 }]), homestead: home.home };
  }

  it("is not written until it has been changed", () => {
    expect("homestead" in toStored(empty())).toBe(false);
    expect(parse(written(empty())).homestead).toBeUndefined();
  });

  it("is written in its short form and read back whole", () => {
    const saved = planted();
    const stored = toStored(saved);
    expect(stored.homestead).toMatchObject({ spent: 50, seeds: { common: 1 } });
    expect(stored.homestead?.things).toContainEqual(["bed", 2, 5, "rare", 0]);
    expect(parse(JSON.stringify(stored))).toEqual(saved);
  });

  it("is read from the first shape", () => {
    const saved = planted();
    const { homestead } = toStored(saved);
    expect(sanitize({ version: 1, results: { "c/t": { outcome: "first", choices: [1], at: "" } }, xp: { "c/t": 50 }, homestead })).toEqual(saved);
  });

  it("survives a reset and a change of profile", () => {
    const saved = planted();
    expect(withoutResults(saved).homestead).toBe(saved.homestead);
    expect(withProfile(saved, { name: "Петя" }).homestead).toBe(saved.homestead);
  });
});
