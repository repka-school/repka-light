// Which courses the learner has started, from the saved task results.
import type { CourseSummary } from "./types";
import type { Saved } from "@/store/storage";
import { DRILL_ROUNDS } from "@/lesson/drill";

export type CourseProgress = {
  course: CourseSummary;
  /** Questions solved on the first try and games with a perfect score. */
  done: number;
  /** Questions and games with any saved result. */
  answered: number;
  total: number;
  /** Every question is solved on the first try and every game has a perfect score. */
  finished: boolean;
  /** When the learner last settled a task of the course; empty if never. */
  last: string;
};

/** What progress reads of the saved state. */
export type Practice = Pick<Saved, "results" | "last" | "drills">;

export function courseProgress<T extends Pick<CourseSummary, "slug" | "questions" | "drills">>(course: T, { results, last, drills }: Practice) {
  const answeredQuestions = course.questions.map((id) => results[id]).filter((r) => r !== undefined);
  const scores = (course.drills ?? []).map((id) => drills?.[id]).filter((score) => score !== undefined);
  const answered = answeredQuestions.length + scores.length;
  const done = answeredQuestions.filter((r) => r.outcome === "first").length + scores.filter((score) => score === DRILL_ROUNDS).length;
  const total = course.questions.length + (course.drills?.length ?? 0);
  return { course, done, answered, total, finished: total > 0 && done === total, last: answered ? (last[course.slug] ?? "") : "" };
}

/**
 * The course list in two parts: the courses with at least one saved answer,
 * the most recently practised first, and the rest in their listed order.
 */
export function splitCourses(courses: CourseSummary[], saved: Practice): { started: CourseProgress[]; others: CourseProgress[] } {
  const all = courses.map((course) => courseProgress(course, saved));
  const isStarted = (p: CourseProgress) => p.answered > 0;
  // The sort is stable, so courses practised at the same moment keep their listed order.
  const started = all.filter(isStarted).sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0));
  return { started, others: all.filter((p) => !isStarted(p)) };
}
