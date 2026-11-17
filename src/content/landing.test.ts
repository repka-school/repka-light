import { describe, expect, it } from "vitest";
import { reach, start } from "./landing";
import type { CourseSummary } from "./types";
import type { Outcome, Saved } from "@/store/storage";

const course = (slug: string, questions: string[], grades: string[] = [], lessons = 1): CourseSummary => ({ slug, title: slug, description: "", cover: null, grades, lessons, questions });
const results = (...entries: [id: string, outcome: Outcome, at: string][]): Saved["results"] => Object.fromEntries(entries.map(([id, outcome, at]) => [id, { outcome, choices: [1], at }]));

const a = course("a", ["a/1", "a/2"], ["2"], 2);
const b = course("b", ["b/1"], ["4", "3"], 3);

describe("reach", () => {
  it("adds up the tasks and lessons of every course", () => {
    expect(reach([a, b])).toEqual({ courses: 2, tasks: 3, lessons: 5, grades: ["2", "4"] });
  });

  it("names a single grade once", () => {
    expect(reach([a])).toEqual({ courses: 1, tasks: 2, lessons: 2, grades: ["2"] });
    expect(reach([a, course("c", ["c/1"], ["2"])])?.grades).toEqual(["2"]);
  });

  it("leaves the grades out when no course names one", () => {
    expect(reach([course("c", ["c/1"])])?.grades).toEqual([]);
  });

  it("is null without a task", () => {
    expect(reach([])).toBeNull();
    expect(reach([course("c", [])])).toBeNull();
  });
});

describe("start", () => {
  it("opens the only course when nothing is saved", () => {
    expect(start([a], {})).toEqual({ kind: "open", course: a });
  });

  it("leads to the course list when there are several courses or none", () => {
    expect(start([a, b], {})).toEqual({ kind: "choose" });
    expect(start([], {})).toEqual({ kind: "choose" });
  });

  it("continues the unfinished course practised last", () => {
    const saved = results(["a/1", "first", "2026-01-01T10:00:00.000Z"], ["b/1", "wrong", "2026-01-02T10:00:00.000Z"]);
    expect(start([a, b], saved)).toEqual({ kind: "continue", course: b });
  });

  it("skips a finished course", () => {
    const saved = results(["a/1", "second", "2026-01-01T10:00:00.000Z"], ["b/1", "first", "2026-01-02T10:00:00.000Z"]);
    expect(start([a, b], saved)).toEqual({ kind: "continue", course: a });
  });

  it("leads to the course list once the only course is finished", () => {
    expect(start([b], results(["b/1", "first", "2026-01-02T10:00:00.000Z"]))).toEqual({ kind: "choose" });
  });
});
