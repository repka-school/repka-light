// What the index page says about the published courses and where its main
// button leads. Keys and numbers only; the screen turns them into words.
import { splitCourses, type Practice } from "./progress";
import type { CourseSummary } from "./types";

/** How much there is to practise: the courses with a task, their tasks and lessons, and the grades they span. */
export type Reach = { courses: number; tasks: number; lessons: number; grades: string[] };

/** The reach of the course list, or null when it has no task, so the page never says «0 заданий». */
export function reach(courses: CourseSummary[]): Reach | null {
  const available = courses.filter((course) => course.questions.length > 0 || course.drills?.length);
  if (!available.length) return null;
  const tasks = courses.reduce((n, course) => n + course.questions.length, 0);
  const numbers = [...new Set(courses.flatMap((course) => course.grades.map((grade) => parseInt(grade, 10))).filter((n) => !Number.isNaN(n)))].sort((a, b) => a - b);
  const grades = numbers.length > 1 ? [String(numbers[0]), String(numbers[numbers.length - 1])] : numbers.map(String);
  return { courses: available.length, tasks, lessons: courses.reduce((n, course) => n + course.lessons, 0), grades };
}

/**
 * Where the main button leads: back into the course practised last that is
 * not finished yet; into the only course, when nothing is started; otherwise
 * to the course list.
 */
export type Start = { kind: "continue"; course: CourseSummary } | { kind: "open"; course: CourseSummary } | { kind: "choose" };

export function start(courses: CourseSummary[], saved: Practice): Start {
  const { started, others } = splitCourses(courses, saved);
  const current = started.find((progress) => !progress.finished);
  if (current) return { kind: "continue", course: current.course };
  if (courses.length === 1 && others.length === 1) return { kind: "open", course: others[0].course };
  return { kind: "choose" };
}
