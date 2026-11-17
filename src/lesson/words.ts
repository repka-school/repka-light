// A card's state and answers as words and marks, shared by the card, the
// numbers, the summary and the spoken verdict so they always agree.
import type { Choice, QuestionCard } from "@/content/types";
import { cardState, setsOf, type CardState, type Entry, type PrimaryAction } from "./session";
import { t } from "@/strings";

/** The feedback's heading. */
export function verdictWords(entry: Entry): string {
  const state = cardState(entry);
  return { unanswered: "", waiting: t.incorrectStatus, first: t.correct, second: t.rightSecond, wrong: t.incorrect }[state];
}

/** A card state's label, as the numbers' accessible names and the review's tags say it. */
export const stateLabel = (state: CardState): string =>
  ({ unanswered: t.unanswered, waiting: t.waitingStatus, first: t.right, second: t.rightSecond, wrong: t.incorrectStatus })[state];

/** A card state's mark: ✓, the «2» badge, ✗, or none. */
export const stateMark = (state: CardState): string => ({ unanswered: "", waiting: "", first: "✓", second: "2", wrong: "✗" })[state];


/** A set of option ids by its letters, in option order: «А, В и Г». */
export const setPhrase = (choices: Choice[], ids: number[]): string => t.labelSet(...choices.filter((c) => ids.includes(c.id)).map((c) => c.label));

/** «Твой ответ: В», or «Твои ответы: А, затем В» after two tries. */
export function answersPhrase(card: QuestionCard, entry: Entry): string {
  const sets = setsOf(entry);
  if (sets.length === 2) return t.yourAnswers(setPhrase(card.choices, sets[0]), setPhrase(card.choices, sets[1]));
  return sets.length ? t.yourAnswer(setPhrase(card.choices, sets[0])) : "";
}

export const correctPhrase = (card: QuestionCard): string => t.correctAnswer(setPhrase(card.choices, card.correct));

/** What the live region says once an answer is checked. */
export function spokenVerdict(card: QuestionCard, entry: Entry): string {
  const mine = answersPhrase(card, entry);
  if (!entry.final) return `${t.incorrectStatus}. ${mine}. ${t.tryAgain}`;
  return `${verdictWords(entry)} ${mine}. ${correctPhrase(card)}`;
}

export const actionWords = (action: PrimaryAction): string =>
  ({ check: t.submit, checkAgain: t.submitAgain, next: t.next, theoryNext: t.theoryNext, results: t.results })[action];
