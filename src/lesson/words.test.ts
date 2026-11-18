import { describe, expect, it } from "vitest";
import type { QuestionCard } from "@/content/types";
import { t } from "@/strings";
import type { Entry } from "./session";
import { actionWords, answersPhrase, correctPhrase, setPhrase, spokenVerdict, stateLabel, stateMark, verdictWords } from "./words";

const card = (correct: number[], answerKind: QuestionCard["answerKind"] = "single"): QuestionCard => ({
  id: "q",
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
const entry = (first: number[] | null, final: [choices: number[], correct: boolean] | null): Entry => ({ first, final: final && { choices: final[0], correct: final[1] }, seen: false, opened: false });

describe("a set of options", () => {
  it("is named by its letters, in the order of the options", () => {
    const { choices } = card([2]);
    expect(setPhrase(choices, [3])).toBe("В");
    expect(setPhrase(choices, [3, 1])).toBe("А и В");
    expect(setPhrase(choices, [4, 1, 3])).toBe("А, В и Г");
    expect(setPhrase(choices, [])).toBe("");
  });
});

describe("the learner's answers", () => {
  it("are one set, or the first and then the second", () => {
    expect(answersPhrase(card([2]), entry(null, [[2], true]))).toBe("Твой ответ: Б");
    expect(answersPhrase(card([2]), entry([1], null))).toBe("Твой ответ: А");
    expect(answersPhrase(card([2]), entry([1], [[2], true]))).toBe("Твои ответы: А, затем Б");
    expect(answersPhrase(card([1, 3], "multi"), entry([1, 4], [[1, 3], true]))).toBe("Твои ответы: А и Г, затем А и В");
  });

  it("are not named before anything is checked", () => {
    expect(answersPhrase(card([2]), entry(null, null))).toBe("");
  });
});

describe("the spoken verdict", () => {
  it("asks for another try after a wrong first one, without naming the right answer", () => {
    const said = spokenVerdict(card([2]), entry([1], null));
    expect(said).toBe(`${t.incorrectStatus}. Твой ответ: А. ${t.tryAgain}`);
    expect(said).not.toContain("Б");
  });

  it("names the right answer once the task is settled, however it ended", () => {
    expect(spokenVerdict(card([2]), entry(null, [[2], true]))).toBe(`${t.correct} Твой ответ: Б. Правильный ответ: Б`);
    expect(spokenVerdict(card([2]), entry([1], [[2], true]))).toBe(`${t.rightSecond} Твои ответы: А, затем Б. Правильный ответ: Б`);
    expect(spokenVerdict(card([2]), entry([1], [[3], false]))).toBe(`${t.incorrect} Твои ответы: А, затем В. Правильный ответ: Б`);
    expect(correctPhrase(card([1, 3], "multi"))).toBe("Правильный ответ: А и В");
  });
});

describe("a card's state", () => {
  it("has a heading, a label and a mark that agree", () => {
    const states = [entry(null, null), entry([1], null), entry(null, [[2], true]), entry([1], [[2], true]), entry([1], [[3], false])];
    expect(states.map(verdictWords)).toEqual(["", t.incorrectStatus, t.correct, t.rightSecond, t.incorrect]);
    expect((["unanswered", "waiting", "first", "second", "wrong"] as const).map(stateLabel)).toEqual([t.unanswered, t.waitingStatus, t.right, t.rightSecond, t.incorrectStatus]);
    expect((["unanswered", "waiting", "first", "second", "wrong"] as const).map(stateMark)).toEqual(["", "", "✓", "2", "✗"]);
  });
});

describe("the primary button", () => {
  it("has words for each thing it can mean", () => {
    expect((["check", "checkAgain", "next", "theoryNext", "results"] as const).map(actionWords)).toEqual([t.submit, t.submitAgain, t.next, t.theoryNext, t.results]);
  });
});
