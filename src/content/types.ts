// The shape of the course files the content build writes (scripts/build-content.mjs).

export type Choice = { id: number; label: string; text: string; html: string };

export type TheoryCard = { id: string; kind: "theory"; title: string; body: string };

export type QuestionCard = {
  id: string;
  kind: "question";
  answerKind: "single" | "multi";
  body: string;
  /** The options stay hidden until the learner asks for them. */
  hideOptions: boolean;
  points: number | null;
  choices: Choice[];
  /** Ids of the right options. */
  correct: number[];
  hint: string | null;
  explanation: string | null;
};

export type Card = TheoryCard | QuestionCard;
export type Lesson = { slug: string; title: string; cards: Card[] };
export type Module = { slug: string; title: string; lessons: Lesson[] };

export type Course = {
  slug: string;
  title: string;
  description: string;
  cover: string | null;
  grades: string[];
  modules: Module[];
};

export type CourseSummary = {
  slug: string;
  title: string;
  description: string;
  cover: string | null;
  grades: string[];
  lessons: number;
  /** Ids of every question of the course, for its progress. */
  questions: string[];
};

export type CourseIndex = { courses: CourseSummary[] };

export const isQuestion = (card: Card): card is QuestionCard => card.kind === "question";
export const questionsOf = (lesson: Lesson): QuestionCard[] => lesson.cards.filter(isQuestion);
export const lessonsOf = (course: Course): Lesson[] => course.modules.flatMap((m) => m.lessons);
