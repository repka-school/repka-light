// The state of one run through a lesson, and the rules of answering: two
// tries per question, never a third. Pure logic: no DOM, no strings, no storage.
import { isQuestion, type Card, type Lesson, type QuestionCard } from "@/content/types";
import { cardsKey, isDraft, mergeRun, withRun, type Outcome, type Saved, type SavedRun } from "@/store/storage";

/** A settled answer: the set that settled it and whether it was right. */
export type Final = { choices: number[]; correct: boolean };

export type Entry = {
  /** The set of a wrong first try, waiting for the second try or shown beside it. */
  first: number[] | null;
  final: Final | null;
  /** A theory card the learner has moved past. */
  seen: boolean;
  /** Options revealed on a question that hides them until asked. */
  opened: boolean;
  draft?: number[];
};

export type State = {
  index: number;
  entries: Entry[];
  phase: "solving" | "summary";
};

/** Not answered; waiting for a second try; right on the first try; right on the second; wrong on both. */
export type CardState = "unanswered" | "waiting" | "first" | "second" | "wrong";

export type Action =
  | { type: "goTo"; index: number }
  | { type: "select"; id: number }
  | { type: "openOptions" }
  | { type: "check" }
  | { type: "next" }
  | { type: "restart" }
  | { type: "retryMistakes" };

/** How to open a lesson: `continue` keeps what is already solved on the first try, `fresh` starts over. */
export type Intent = "continue" | "fresh";

const blank = (): Entry => ({ first: null, final: null, seen: false, opened: false });

export const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((id) => b.includes(id));

export function cardState(entry: Entry): CardState {
  if (!entry.final) return entry.first ? "waiting" : "unanswered";
  if (!entry.final.correct) return "wrong";
  return entry.first ? "second" : "first";
}

export const outcomeOf = (entry: Entry): Outcome | null => {
  const state = cardState(entry);
  return state === "first" || state === "second" || state === "wrong" ? state : null;
};

const done = (card: Card, entry: Entry) => (isQuestion(card) ? !!entry.final : entry.seen);

export const doneCount = (lesson: Lesson, state: State) => lesson.cards.filter((card, i) => done(card, state.entries[i])).length;
export const allAnswered = (lesson: Lesson, state: State) => lesson.cards.every((card, i) => !isQuestion(card) || !!state.entries[i].final);
export const countOf = (lesson: Lesson, state: State, wanted: CardState) => lesson.cards.filter((card, i) => isQuestion(card) && cardState(state.entries[i]) === wanted).length;

/** A question's number among the lesson's questions, from 1; theory cards are not numbered. */
export const questionNumber = (lesson: Lesson, index: number) => lesson.cards.slice(0, index + 1).filter(isQuestion).length;

/** Where a lesson stands for the learner: not started, started, or every question solved on the first try. */
export type LessonState = "new" | "partial" | "finished";

export function lessonState(questions: { id: string }[], results: Saved["results"]): LessonState {
  if (questions.every((q) => results[q.id]?.outcome === "first")) return "finished";
  return questions.some((q) => results[q.id]) ? "partial" : "new";
}

/**
 * A run's opening state. Continuing shows the questions already solved on
 * the first try as answered and opens at the first card still to do; a
 * lesson not started opens at its first card, theory included.
 */
export function start(lesson: Lesson, results: Saved["results"], intent: Intent): State {
  const entries = lesson.cards.map((card) => {
    const entry = blank();
    const saved = isQuestion(card) ? results[card.id] : undefined;
    if (intent === "continue" && saved?.outcome === "first") entry.final = { choices: saved.choices, correct: true };
    return entry;
  });
  const started = entries.some((e) => e.final);
  if (started) lesson.cards.forEach((card, i) => (entries[i].seen = !isQuestion(card)));
  const open = lesson.cards.findIndex((card, i) => !done(card, entries[i]));
  return { index: Math.max(open, 0), entries, phase: "solving" };
}

/** A pass as it is saved: every card's answers, the card on screen and whether the summary is showing. */
export function snapshot(lesson: Lesson, state: State): SavedRun {
  const entries = state.entries.map(({ first, final, seen, opened, draft }) => ({ first, final: final?.choices ?? null, seen, opened, ...(draft && { draft }) }));
  return { cards: cardsKey(lesson.cards.map((c) => c.id)), index: state.index, phase: state.phase, entries };
}

/**
 * A saved pass brought back, or null when it no longer fits the lesson (its
 * cards or options changed). Whether an answer was right is worked out again
 * from the lesson, never taken from what was stored; a question whose saved
 * first try has since become the right answer is asked again.
 */
export function restore(lesson: Lesson, run: SavedRun): State | null {
  if (run.cards !== cardsKey(lesson.cards.map((c) => c.id)) || run.entries.length !== lesson.cards.length) return null;
  const entries: Entry[] = [];
  for (const [i, card] of lesson.cards.entries()) {
    const saved = run.entries[i];
    if (!isQuestion(card)) {
      entries.push({ ...blank(), seen: saved.seen });
      continue;
    }
    const known = (ids: number[]) => ids.every((id) => card.choices.some((c) => c.id === id));
    if ([saved.first, saved.final].some((ids) => ids && (!ids.length || !known(ids)))) return null;
    // A first try the lesson now counts as right was never a wrong one: the question is asked again, with nothing locked.
    if (saved.first && sameSet(card.correct, saved.first)) {
      entries.push({ ...blank(), opened: saved.opened });
      continue;
    }
    const entry: Entry = { first: saved.first, final: saved.final ? { choices: saved.final, correct: sameSet(card.correct, saved.final) } : null, seen: false, opened: saved.opened };
    const draft = saved.draft;
    if (!entry.final && isDraft(draft) && known(draft)) {
      const selectableRadio = draft.length === 1 && !saved.first?.includes(draft[0]);
      if (card.answerKind === "multi" || selectableRadio) entry.draft = draft;
    }
    entries.push(entry);
  }
  const state: State = { index: run.index, entries, phase: "solving" };
  if (run.phase === "summary" && allAnswered(lesson, state)) return { ...state, phase: "summary" };
  return state;
}

/**
 * The state a lesson opens in. A saved pass comes back as it was left, a
 * finished one as its summary, so the learner sees their mistakes and picks
 * what to do next. With no pass saved, the lesson starts from the saved
 * results: over from the beginning once every question is solved on the
 * first try, otherwise keeping those that are and asking the rest.
 */
export function open(lesson: Lesson, saved: Pick<Saved, "results">, run: SavedRun | undefined): State {
  const kept = run ? restore(lesson, run) : null;
  if (kept) return kept;
  return start(lesson, saved.results, lessonState(lesson.cards.filter(isQuestion), saved.results) === "finished" ? "fresh" : "continue");
}

/** Reopen the latest valid pass under the store lock, including changes from other tabs. */
export function lessonStep(lesson: Lesson, key: string, before: State, next: State, restart: boolean) {
  const run = snapshot(lesson, next);
  if (restart) return (saved: Saved) => withRun(saved, key, run);
  const previous = snapshot(lesson, before);
  return (saved: Saved) => {
    const current = snapshot(lesson, open(lesson, saved, saved.runs[key]));
    return withRun(saved, key, mergeRun(current, previous, run));
  };
}

/** Whether a pass has any question not solved on the first try: one to retry. */
export const hasMistakes = (lesson: Lesson, state: State): boolean => lesson.cards.some((card, i) => isQuestion(card) && cardState(state.entries[i]) !== "first");

/**
 * A new pass over a pass's mistakes: the questions it solved on the first
 * try stay answered, every other question is asked again from its first try,
 * and the pass opens at the first of them.
 */
export function retryMistakes(lesson: Lesson, state: State): State {
  const entries = lesson.cards.map((card, i): Entry => {
    if (!isQuestion(card)) return { ...blank(), seen: true };
    const entry = state.entries[i];
    return cardState(entry) === "first" ? { ...blank(), final: entry.final, opened: entry.opened } : blank();
  });
  const open = lesson.cards.findIndex((card, i) => !done(card, entries[i]));
  return { index: Math.max(open, 0), entries, phase: "solving" };
}

/** Apply one tile's intended checked state to the latest pass, including other tabs' picks. */
export function lessonPick(lesson: Lesson, key: string, index: number, id: number, checked: boolean) {
  return (saved: Saved) => {
    const run = open(lesson, saved, saved.runs[key]);
    const entry = run.entries[index];
    if (entry.final || picked(lesson.cards[index], entry).includes(id) === checked) return saved;
    const current: State = { ...run, index, phase: "solving" };
    const next = reduce(lesson, current, { type: "select", id });
    return next === current ? saved : withRun(saved, key, snapshot(lesson, next));
  };
}

/** Whether a saved pass holds any answer, checked or settled. */
export const hasAnswers = (run: SavedRun | undefined): boolean => !!run && run.entries.some((e) => e.first || e.final);

/** Without an edited draft, a multi question starts its second attempt with the first set checked. */
export function picked(card: Card, entry: Entry): number[] {
  if (entry.final || !isQuestion(card)) return [];
  return entry.draft ?? (card.answerKind === "multi" ? entry.first : null) ?? [];
}

/** Whether the picked set may be checked: something is picked, and a second set differs from the first. */
export function checkable(card: Card, state: State): boolean {
  const entry = state.entries[state.index];
  const selected = picked(card, entry);
  return selected.length > 0 && !(entry.first && sameSet(entry.first, selected));
}

/** A `multi` card's second set equals its first: «Такой ответ уже был». */
export function sameAsFirst(card: QuestionCard, state: State): boolean {
  const entry = state.entries[state.index];
  return card.answerKind === "multi" && !entry.final && !!entry.first && sameSet(entry.first, picked(card, entry));
}

function at(state: State, patch: Partial<Entry>): Entry[] {
  return state.entries.map((entry, i) => (i === state.index ? { ...entry, ...patch } : entry));
}

export function reduce(lesson: Lesson, state: State, action: Action): State {
  const card = lesson.cards[state.index];
  const entry = state.entries[state.index];
  switch (action.type) {
    case "goTo": {
      if (action.index < 0 || action.index >= lesson.cards.length || action.index === state.index) return state;
      return { ...state, index: action.index, phase: "solving" };
    }
    case "select": {
      if (!isQuestion(card) || entry.final || !card.choices.some((c) => c.id === action.id)) return state;
      const selected = picked(card, entry);
      let draft = [action.id];
      if (card.answerKind === "multi") {
        draft = selected.includes(action.id) ? selected.filter((id) => id !== action.id) : [...selected, action.id];
      } else if (entry.first?.includes(action.id) || selected.includes(action.id)) return state;
      return { ...state, entries: at(state, { draft }) };
    }
    case "openOptions":
      return entry.opened ? state : { ...state, entries: at(state, { opened: true }) };
    case "check": {
      if (!isQuestion(card) || !checkable(card, state)) return state;
      const choices = picked(card, entry);
      const correct = sameSet(card.correct, choices);
      if (correct || entry.first) return { ...state, entries: at(state, { final: { choices, correct }, draft: undefined }) };
      return { ...state, entries: at(state, { first: choices, draft: undefined }) };
    }
    case "next": {
      const entries = isQuestion(card) ? state.entries : at(state, { seen: true });
      const moved = { ...state, entries };
      if (allAnswered(lesson, moved)) return { ...moved, phase: "summary" };
      // The next card in order, else the first question still unanswered.
      const following = state.index + 1 < lesson.cards.length ? state.index + 1 : lesson.cards.findIndex((c, i) => isQuestion(c) && !entries[i].final);
      return reduce(lesson, moved, { type: "goTo", index: following });
    }
    case "restart":
      return start(lesson, {}, "fresh");
    case "retryMistakes":
      return hasMistakes(lesson, state) ? retryMistakes(lesson, state) : state;
  }
}

/** The primary button's meaning on the current card. */
export type PrimaryAction = "check" | "checkAgain" | "next" | "theoryNext" | "results";

export function primaryAction(lesson: Lesson, state: State): PrimaryAction {
  const card = lesson.cards[state.index];
  const entry = state.entries[state.index];
  if (!isQuestion(card)) return allAnswered(lesson, state) ? "results" : "theoryNext";
  if (entry.final) return allAnswered(lesson, state) ? "results" : "next";
  return entry.first ? "checkAgain" : "check";
}

/** The sets the learner checked on a card, in order: one, or the first and the second. */
export function setsOf(entry: Entry): number[][] {
  const last = entry.final?.choices ?? entry.first ?? [];
  if (entry.final && entry.first && !sameSet(entry.first, entry.final.choices)) return [entry.first, entry.final.choices];
  return last.length ? [last] : [];
}

/**
 * What a card's tiles mark: every right option once the answer is settled,
 * and the wrong options the learner chose (on a `multi` card, of the last set only).
 */
export function marksOf(card: QuestionCard, entry: Entry): { correct: number[]; wrong: number[]; mine: number[] } {
  const multi = card.answerKind === "multi";
  const last = entry.final?.choices ?? entry.first ?? [];
  const mine = multi ? last : [...new Set([...(entry.first ?? []), ...last])];
  const correct = entry.final ? card.correct : [];
  return { correct, wrong: entry.final || !multi ? mine.filter((id) => !card.correct.includes(id)) : [], mine };
}
