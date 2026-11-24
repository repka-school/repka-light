import type { Card, Choice, Course, CourseIndex, CourseSource, CourseSummary, DrillFact, Lesson, LessonSummary, Module, Program, ProgramSection, ProgramSummary, ProgramTopic, TheoryBlock, TheoryItem } from "./types";

// Validate static JSON before caching it. A stale or incomplete deployment can return
// a different resource at a valid URL. The build sanitizes rich bodies before publication.
type Check = (value: unknown) => boolean;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const string: Check = (value) => typeof value === "string";
const number: Check = (value) => typeof value === "number" && Number.isFinite(value);
const boolean: Check = (value) => typeof value === "boolean";
const list = (check: Check): Check => (value) => Array.isArray(value) && value.every(check);
const optional = (check: Check): Check => (value) => value === undefined || check(value);
const nullable = (check: Check): Check => (value) => value === null || check(value);
function fields<T extends object>(checks: Record<keyof T, Check>) {
  const entries = Object.entries<Check>(checks);
  return (value: unknown): value is T => record(value) && entries.every(([key, check]) => check(value[key]));
}
const stringList = list(string);
const link = fields({ title: string, url: string });
const scored = fields({ id: string, points: nullable(number) });
const lessonSummary = fields<LessonSummary>({ slug: string, title: string, questions: list(scored), theoryCount: number, drill: optional(string) });
const module = fields<Module>({ slug: string, title: string, lessons: list(lessonSummary) });
const courseFields = { slug: string, title: string, description: string, grades: stringList, cover: nullable(string), coverPicture: optional(string) };
const source = fields<CourseSource>({
  book: fields({ title: string, url: string, author: string, edition: number, year: number, copyright: string, language: string, license: link }),
  sections: list(link),
});
export const isCourse = fields<Course>({ ...courseFields, modules: list(module), source: optional(source) });
const courseSummary = fields<CourseSummary>({ ...courseFields, lessons: number, questions: stringList, drills: optional(stringList) });

const programFields = { slug: string, title: string, description: string, grades: stringList };
const programSummary = fields<ProgramSummary>({ ...programFields, topics: number });
const topic = fields<ProgramTopic>({ slug: string, title: string, section: optional(string), covers: stringList });
const section = fields<ProgramSection>({ slug: string, title: string, picture: optional(string) });
export const isProgram = fields<Program>({ ...programFields, sections: list(section), topics: list(topic) });
export const isIndex = fields<CourseIndex>({ courses: list(courseSummary), programs: list(programSummary) });

const item = fields<TheoryItem>({ title: string, text: string, picture: string });
function block(value: unknown): value is TheoryBlock {
  if (!record(value)) return false;
  switch (value.kind) {
    case "steps": case "facts": case "tiles": return string(value.title) && list(item)(value.items);
    case "image": return string(value.html);
    case "says": return string(value.text);
    case "tip": return string(value.text) && string(value.picture);
    case "try": return string(value.title) && string(value.text) && string(value.answer) && nullable(string)(value.picture);
    default: return false;
  }
}
const fact = fields<DrillFact>({ prompt: string, promptHtml: optional(string), answer: number });
const choice = fields<Choice>({ id: number, label: string, text: string, html: string });
function card(value: unknown): value is Card {
  if (!record(value) || !string(value.id)) return false;
  switch (value.kind) {
    case "theory":
      return string(value.title) && string(value.body) && list(block)(value.blocks);
    case "question":
      return string(value.body) && (value.answerKind === "single" || value.answerKind === "multi") && nullable(number)(value.points)
        && boolean(value.hideOptions) && list(choice)(value.choices) && list(number)(value.correct)
        && nullable(string)(value.hint) && nullable(string)(value.explanation);
    case "drill":
      return list(fact)(value.facts) && optional(list(fact))(value.alternateFacts) && optional(boolean)(value.equation)
        && (value.answerLabels === undefined || (record(value.answerLabels) && Object.values(value.answerLabels).every(string)));
    default:
      return false;
  }
}
const lesson = fields<Lesson>({ slug: string, title: string, cards: list(card) });
export function isLesson(value: unknown): value is Lesson {
  if (!lesson(value)) return false;
  const drill = value.cards.some((c) => c.kind === "drill");
  return drill ? value.cards.some((c) => c.kind === "theory") : value.cards.some((c) => c.kind === "question");
}
