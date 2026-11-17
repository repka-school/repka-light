import { describe, expect, it } from "vitest";
import type { Lesson, QuestionCard } from "@/content/types";
import { allAnswered, cardState, checkable, countOf, doneCount, hasAnswers, hasMistakes, lessonState, marksOf, open, outcomeOf, primaryAction, questionNumber, reduce, restore, sameAsFirst, setsOf, snapshot, start, type Action, type State } from "./session";

const question = (id: string, correct: number[], answerKind: QuestionCard["answerKind"] = "single"): QuestionCard => ({
  id,
  kind: "question",
  answerKind,
  body: "",
  hideOptions: false,
  points: 1,
  choices: [1, 2, 3, 4].map((n) => ({ id: n, label: "АБВГ"[n - 1], text: String(n), html: String(n) })),
  correct,
  hint: null,
  explanation: null,
});

const lesson: Lesson = {
  slug: "l",
  title: "L",
  cards: [{ id: "th", kind: "theory", title: "T", body: "", blocks: [] }, question("q1", [2]), question("q2", [1, 3], "multi")],
};

const run = (state: State, ...actions: Action[]) => actions.reduce((s, a) => reduce(lesson, s, a), state);
const fresh = () => start(lesson, {}, "fresh");
const saved = (outcome: "first" | "second" | "wrong") => ({ outcome, choices: [2], at: "" });

describe("start", () => {
  it("opens a new lesson at its theory card", () => {
    const state = fresh();
    expect(state.index).toBe(0);
    expect(primaryAction(lesson, state)).toBe("theoryNext");
  });

  it("continues after the questions already solved on the first try", () => {
    const state = start(lesson, { q1: saved("first") }, "continue");
    expect(state.index).toBe(2);
    expect(cardState(state.entries[1])).toBe("first");
    expect(doneCount(lesson, state)).toBe(2);
  });

  it("asks again for a question that was not solved on the first try", () => {
    const state = start(lesson, { q1: saved("second") }, "continue");
    expect(cardState(state.entries[1])).toBe("unanswered");
  });

  it("starts over when asked to, whatever is saved", () => {
    const state = start(lesson, { q1: saved("first") }, "fresh");
    expect(state.entries.every((e) => !e.final)).toBe(true);
  });
});

describe("a single answer", () => {
  it("is right on the first try", () => {
    const state = run(fresh(), { type: "next" }, { type: "select", id: 2 }, { type: "check" });
    expect(cardState(state.entries[1])).toBe("first");
    expect(outcomeOf(state.entries[1])).toBe("first");
    expect(primaryAction(lesson, state)).toBe("next");
  });

  it("gets one more try, with the wrong letter locked", () => {
    const wrong = run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" });
    expect(cardState(wrong.entries[1])).toBe("waiting");
    expect(outcomeOf(wrong.entries[1])).toBeNull();
    expect(wrong.selected).toEqual([]);
    expect(checkable(wrong)).toBe(false);
    expect(run(wrong, { type: "select", id: 1 }).selected).toEqual([]);
    expect(primaryAction(lesson, wrong)).toBe("checkAgain");

    const second = run(wrong, { type: "select", id: 2 }, { type: "check" });
    expect(cardState(second.entries[1])).toBe("second");
    expect(setsOf(second.entries[1])).toEqual([[1], [2]]);
    expect(marksOf(lesson.cards[1] as QuestionCard, second.entries[1])).toEqual({ correct: [2], wrong: [1], mine: [1, 2] });
  });

  it("is wrong after two wrong tries, and takes no third", () => {
    const state = run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" }, { type: "select", id: 3 }, { type: "check" });
    expect(cardState(state.entries[1])).toBe("wrong");
    expect(run(state, { type: "select", id: 2 }, { type: "check" })).toEqual(state);
  });

  it("cannot be checked with nothing picked", () => {
    const state = run(fresh(), { type: "next" });
    expect(run(state, { type: "check" })).toBe(state);
  });
});

describe("a multi answer", () => {
  const atMulti = () => run(fresh(), { type: "goTo", index: 2 });

  it("needs every right option and no other", () => {
    const state = run(atMulti(), { type: "select", id: 1 }, { type: "select", id: 3 }, { type: "check" });
    expect(cardState(state.entries[2])).toBe("first");
  });

  it("toggles a tile and refuses the same set twice", () => {
    const wrong = run(atMulti(), { type: "select", id: 1 }, { type: "select", id: 2 }, { type: "select", id: 2 }, { type: "select", id: 4 }, { type: "check" });
    expect(cardState(wrong.entries[2])).toBe("waiting");
    expect(wrong.selected).toEqual([1, 4]);
    expect(sameAsFirst(lesson.cards[2] as QuestionCard, wrong)).toBe(true);
    expect(checkable(wrong)).toBe(false);
    const second = run(wrong, { type: "select", id: 4 }, { type: "select", id: 3 }, { type: "check" });
    expect(cardState(second.entries[2])).toBe("second");
  });

  it("keeps its first set ticked when the learner comes back to it", () => {
    const wrong = run(atMulti(), { type: "select", id: 2 }, { type: "check" });
    expect(run(wrong, { type: "goTo", index: 1 }, { type: "goTo", index: 2 }).selected).toEqual([2]);
  });
});

describe("moving through the lesson", () => {
  it("numbers questions without the theory card", () => {
    expect(questionNumber(lesson, 1)).toBe(1);
    expect(questionNumber(lesson, 2)).toBe(2);
  });

  it("returns to an unanswered question before the summary", () => {
    const state = run(fresh(), { type: "goTo", index: 2 }, { type: "select", id: 1 }, { type: "select", id: 3 }, { type: "check" }, { type: "next" });
    expect(state.phase).toBe("solving");
    expect(state.index).toBe(1);
  });

  it("ends in the summary once every question is settled", () => {
    const state = run(fresh(), { type: "next" }, { type: "select", id: 2 }, { type: "check" }, { type: "next" }, { type: "select", id: 2 }, { type: "check" }, { type: "select", id: 4 }, { type: "check" });
    expect(allAnswered(lesson, state)).toBe(true);
    expect(primaryAction(lesson, state)).toBe("results");
    const summary = run(state, { type: "next" });
    expect(summary.phase).toBe("summary");
    expect(countOf(lesson, summary, "first")).toBe(1);
    expect(countOf(lesson, summary, "wrong")).toBe(1);
    expect(run(summary, { type: "restart" })).toEqual(fresh());
  });
});

describe("a pass saved and brought back", () => {
  // The pass goes through JSON, as it does through storage.
  const reload = (state: State) => restore(lesson, JSON.parse(JSON.stringify(snapshot(lesson, state))));

  it("keeps a wrong first try waiting, with its letter still locked", () => {
    const waiting = run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" });
    const back = reload(waiting)!;
    expect(back).toEqual(waiting);
    expect(cardState(back.entries[1])).toBe("waiting");
    expect(run(back, { type: "select", id: 1 }).selected).toEqual([]);
    expect(cardState(run(back, { type: "select", id: 2 }, { type: "check" }).entries[1])).toBe("second");
  });

  it("keeps a question answered wrong twice as wrong", () => {
    const wrong = run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" }, { type: "select", id: 3 }, { type: "check" });
    const back = reload(wrong)!;
    expect(cardState(back.entries[1])).toBe("wrong");
    expect(setsOf(back.entries[1])).toEqual([[1], [3]]);
  });

  it("brings a multi card between its tries back with its first set ticked", () => {
    const waiting = run(fresh(), { type: "goTo", index: 2 }, { type: "select", id: 2 }, { type: "check" });
    expect(reload(waiting)!.selected).toEqual([2]);
  });

  it("keeps the summary", () => {
    const done = run(fresh(), { type: "next" }, { type: "select", id: 2 }, { type: "check" }, { type: "next" }, { type: "select", id: 1 }, { type: "select", id: 3 }, { type: "check" }, { type: "next" });
    expect(done.phase).toBe("summary");
    expect(reload(done)).toEqual(done);
  });

  it("works out again whether an answer was right, whatever was stored", () => {
    const saved = snapshot(lesson, run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" }, { type: "select", id: 3 }, { type: "check" }));
    saved.entries[1].final!.correct = true;
    expect(cardState(restore(lesson, saved)!.entries[1])).toBe("wrong");
  });

  it("is dropped when the lesson's cards or options are no longer the same", () => {
    const saved = snapshot(lesson, run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" }));
    expect(restore({ ...lesson, cards: lesson.cards.slice(0, 2) }, saved)).toBeNull();
    expect(restore({ ...lesson, cards: [lesson.cards[0], lesson.cards[2], lesson.cards[1]] }, saved)).toBeNull();
    expect(restore(lesson, { ...saved, entries: saved.entries.map((e, i) => (i === 1 ? { ...e, first: [9] } : e)) })).toBeNull();
  });
});

describe("open", () => {
  const unfinished = snapshot(lesson, run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" }));
  const finishedPass = snapshot(lesson, run(fresh(), { type: "next" }, { type: "select", id: 1 }, { type: "check" }, { type: "select", id: 3 }, { type: "check" }, { type: "next" }, { type: "select", id: 1 }, { type: "select", id: 3 }, { type: "check" }, { type: "next" }));
  const results = { q1: saved("wrong"), q2: { outcome: "first" as const, choices: [1, 3], at: "" } };

  it("resumes an unfinished pass however the lesson is opened", () => {
    expect(cardState(open(lesson, { results: {} }, unfinished).entries[1])).toBe("waiting");
  });

  it("shows a finished pass as its summary, mistakes included", () => {
    const state = open(lesson, { results }, finishedPass);
    expect(state.phase).toBe("summary");
    expect(cardState(state.entries[1])).toBe("wrong");
  });

  it("starts from the saved results when no pass is saved or it no longer fits", () => {
    expect(open(lesson, { results: {} }, undefined)).toEqual(fresh());
    expect(open(lesson, { results: {} }, { ...unfinished, cards: ["other"] })).toEqual(fresh());
    // Without a pass, the questions solved on the first try stay solved.
    const state = open(lesson, { results }, undefined);
    expect(cardState(state.entries[2])).toBe("first");
    expect(state.index).toBe(1);
  });

  it("knows a pass with answers from one without", () => {
    expect(hasAnswers(undefined)).toBe(false);
    expect(hasAnswers(snapshot(lesson, run(fresh(), { type: "next" })))).toBe(false);
    expect(hasAnswers(unfinished)).toBe(true);
  });
});

describe("lessonState", () => {
  it("is new, then partial, then finished when every question is solved on the first try", () => {
    expect(lessonState(lesson, {})).toBe("new");
    expect(lessonState(lesson, { q1: saved("wrong") })).toBe("partial");
    expect(lessonState(lesson, { q1: saved("first"), q2: saved("second") })).toBe("partial");
    expect(lessonState(lesson, { q1: saved("first"), q2: saved("first") })).toBe("finished");
  });
});

describe("retryMistakes", () => {
  const pick = (...ids: number[]): Action[] => [...ids.map((id): Action => ({ type: "select", id })), { type: "check" }];
  const next: Action = { type: "next" };
  // q1 missed on both tries, q2 right on the first.
  const withMistake = run(fresh(), next, ...pick(1), ...pick(3), next, ...pick(1, 3), next);
  // q1 right on the second try, q2 right on the first.
  const second = run(fresh(), next, ...pick(1), ...pick(2), next, ...pick(1, 3), next);
  const perfect = run(fresh(), next, ...pick(2), next, ...pick(1, 3), next);

  it("knows a pass with something to retry", () => {
    expect(withMistake.phase).toBe("summary");
    expect(hasMistakes(lesson, withMistake)).toBe(true);
    expect(hasMistakes(lesson, second)).toBe(true);
    expect(hasMistakes(lesson, perfect)).toBe(false);
  });

  it("asks again every question not solved on the first try and keeps the rest", () => {
    for (const pass of [withMistake, second]) {
      const state = run(pass, { type: "retryMistakes" });
      expect(state.phase).toBe("solving");
      expect(state.index).toBe(1);
      expect(cardState(state.entries[1])).toBe("unanswered");
      expect(cardState(state.entries[2])).toBe("first");
    }
  });

  it("ends in a summary of the new pass", () => {
    const state = run(withMistake, { type: "retryMistakes" }, ...pick(2), next);
    expect(state.phase).toBe("summary");
    expect(countOf(lesson, state, "first")).toBe(2);
  });

  it("does nothing on a pass without mistakes", () => {
    expect(run(perfect, { type: "retryMistakes" })).toBe(perfect);
  });
});
