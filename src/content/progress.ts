// Which courses the learner has started, from the saved task results.
import type { CourseSummary } from "./types";
import type { Saved } from "@/store/storage";

export type CourseProgress = {
  course: CourseSummary;
  /** Questions solved on the first try. */
  done: number;
  /** Questions with any saved result: solved on either try, or missed. */
  answered: number;
  total: number;
  /** Every question is solved on the first try. */
  finished: boolean;
  /** When the learner last settled a task of the course; empty if never. */
  last: string;
};

export function courseProgress(course: CourseSummary, results: Saved["results"]): CourseProgress {
  const answered = course.questions.map((id) => results[id]).filter((r) => r !== undefined);
  const done = answered.filter((r) => r.outcome === "first").length;
  const total = course.questions.length;
  return { course, done, answered: answered.length, total, finished: total > 0 && done === total, last: answered.reduce((latest, r) => (r.at > latest ? r.at : latest), "") };
}

/**
 * The course list in two parts: the courses with at least one saved answer,
 * the most recently practised first, and the rest in their listed order.
 */
export function splitCourses(courses: CourseSummary[], results: Saved["results"]): { started: CourseProgress[]; others: CourseProgress[] } {
  const all = courses.map((course) => courseProgress(course, results));
  const isStarted = (p: CourseProgress) => p.course.questions.some((id) => results[id] !== undefined);
  // The sort is stable, so courses practised at the same moment keep their listed order.
  const started = all.filter(isStarted).sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0));
  return { started, others: all.filter((p) => !isStarted(p)) };
}
