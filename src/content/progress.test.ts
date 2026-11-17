import { describe, expect, it } from "vitest";
import type { CourseSummary } from "./types";
import { courseProgress, splitCourses } from "./progress";
import type { Outcome, Saved } from "@/store/storage";

const course = (slug: string, questions: string[]): CourseSummary => ({ slug, title: slug, description: "", cover: null, grades: [], lessons: 1, questions });
const results = (...entries: [id: string, outcome: Outcome, at: string][]): Saved["results"] => Object.fromEntries(entries.map(([id, outcome, at]) => [id, { outcome, choices: [1], at }]));

const a = course("a", ["a/1", "a/2"]);
const b = course("b", ["b/1"]);
const c = course("c", ["c/1", "c/2"]);
const slugs = (list: { course: CourseSummary }[]) => list.map((p) => p.course.slug);

describe("splitCourses", () => {
  it("lists every course as not started when nothing is saved", () => {
    const { started, others } = splitCourses([a, b, c], {});
    expect(started).toEqual([]);
    expect(slugs(others)).toEqual(["a", "b", "c"]);
  });

  it("counts a course as started from its first answer, right or wrong", () => {
    const { started, others } = splitCourses([a, b, c], results(["b/1", "wrong", "2026-01-01T10:00:00.000Z"]));
    expect(slugs(started)).toEqual(["b"]);
    expect(slugs(others)).toEqual(["a", "c"]);
  });

  it("puts the most recently practised course first", () => {
    const saved = results(["a/1", "first", "2026-01-01T10:00:00.000Z"], ["c/1", "second", "2026-01-03T10:00:00.000Z"], ["c/2", "first", "2026-01-02T10:00:00.000Z"], ["b/1", "first", "2026-01-02T12:00:00.000Z"]);
    expect(slugs(splitCourses([a, b, c], saved).started)).toEqual(["c", "b", "a"]);
  });

  it("ignores saved answers of tasks no listed course has", () => {
    expect(splitCourses([a], results(["gone/1", "first", "2026-01-01T10:00:00.000Z"])).started).toEqual([]);
  });
});

describe("courseProgress", () => {
  it("counts first-try answers and is finished only when all are", () => {
    expect(courseProgress(a, results(["a/1", "first", "t1"], ["a/2", "second", "t2"]))).toMatchObject({ done: 1, answered: 2, total: 2, finished: false, last: "t2" });
    expect(courseProgress(a, results(["a/1", "first", "t1"], ["a/2", "first", "t2"]))).toMatchObject({ done: 2, finished: true });
    expect(courseProgress(course("empty", []), {})).toMatchObject({ done: 0, total: 0, finished: false, last: "" });
  });
});
