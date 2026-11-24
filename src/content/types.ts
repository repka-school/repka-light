// The shape of the course and program files the content build writes (scripts/build-content.mjs).

export type Choice = { id: number; label: string; text: string; html: string };

/** A drawing with a title and, for most, a line under it. */
export type TheoryItem = { picture: string; title: string; text: string };

/** One piece of a theory card, in the order the card shows them. */
export type TheoryBlock =
  | { kind: "says"; text: string }
  | { kind: "steps" | "facts" | "tiles"; title: string; items: TheoryItem[] }
  | { kind: "image"; html: string }
  | { kind: "try"; title: string; text: string; answer: string; picture: string | null }
  | { kind: "tip"; picture: string; text: string };

/** A theory card: a body, blocks, or both; `body` is empty when the card is blocks alone. */
export type TheoryCard = { id: string; kind: "theory"; title: string; body: string; blocks: TheoryBlock[] };

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

export type DrillFact = { prompt: string; promptHtml?: string; answer: number };
export type DrillCard = {
  id: string;
  kind: "drill";
  facts: DrillFact[];
  alternateFacts?: DrillFact[];
  answerLabels?: Record<number, string>;
  equation?: boolean;
};

export type Card = TheoryCard | QuestionCard | DrillCard;
export type Lesson = { slug: string; title: string; cards: Card[] };
/** Course outlines carry only the fields needed for navigation, progress and legacy XP. */
export type LessonSummary = {
  slug: string;
  title: string;
  questions: Pick<QuestionCard, "id" | "points">[];
  theoryCount: number;
  drill?: string;
};
export type Module = { slug: string; title: string; lessons: LessonSummary[] };

type ReferenceLink = { title: string; url: string };

export type CourseSource = {
  book: ReferenceLink & {
    author: string;
    edition: number;
    year: number;
    copyright: string;
    language: string;
    license: ReferenceLink;
  };
  sections: ReferenceLink[];
};

export type Course = {
  slug: string;
  title: string;
  description: string;
  cover: string | null;
  coverPicture?: string;
  grades: string[];
  modules: Module[];
  source?: CourseSource;
};

export type CourseSummary = {
  slug: string;
  title: string;
  description: string;
  cover: string | null;
  coverPicture?: string;
  grades: string[];
  lessons: number;
  /** Ids of every question of the course, for its progress. */
  questions: string[];
  /** Ids of repeatable games whose best score counts towards progress. */
  drills?: string[];
};

/** A part of the subject a program's topics belong to, «Алгебра» or «Геометрия», and the built-in drawing it is told by. */
export type ProgramSection = { slug: string; title: string; picture?: string };

/** A topic of a program, the slug of its section, when it has one, and the points it covers; the list may be empty. */
export type ProgramTopic = { slug: string; title: string; section?: string; covers: string[] };

/** A program: the main topics of a school year, in order. It is a plan and names no lessons. */
export type Program = { slug: string; title: string; description: string; grades: string[]; sections: ProgramSection[]; topics: ProgramTopic[] };

export type ProgramSummary = Omit<Program, "topics" | "sections"> & {
  /** How many topics the program has. */
  topics: number;
};

export type CourseIndex = { courses: CourseSummary[]; programs: ProgramSummary[] };

export const isQuestion = (card: Card): card is QuestionCard => card.kind === "question";
export const questionsOf = (lesson: Lesson): QuestionCard[] => lesson.cards.filter(isQuestion);
export const drillOf = (lesson: Lesson) => lesson.cards.find((card) => card.kind === "drill");
export const lessonsOf = (course: Course): LessonSummary[] => course.modules.flatMap((m) => m.lessons);
