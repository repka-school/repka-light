import type { DrillFact } from "@/content/types";

export const DRILL_ROUNDS = 10;
export const DRILL_SECONDS = 5;

export type DrillQuestion = DrillFact & { options: number[] };

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Balance the three keys across a game and allow at most two in a row on any key. */
function answerPositions(count: number): number[] {
  const keys = [0, 1, 2];
  const balanced = Array.from({ length: Math.ceil(count / keys.length) }, () => shuffled(keys)).flat().slice(0, count);
  for (let attempt = 0; attempt < 12; attempt++) {
    const positions = shuffled(balanced);
    const triple = positions.some((key, index) => key === positions[index - 1] && key === positions[index - 2]);
    if (!triple) return positions;
  }
  // Each group already uses every key once, so its boundaries can only make pairs.
  return balanced;
}

/** Each fact appears at most once. Wrong answers come from nearby facts in the same pool. */
function selectFacts(facts: DrillFact[], count: number) {
  const answers = [...new Set(facts.map((fact) => fact.answer))];
  return shuffled(facts).slice(0, count).map((fact) => {
    const near = answers.filter((n) => n !== fact.answer)
      .sort((a, b) => Math.abs(a - fact.answer) - Math.abs(b - fact.answer))
      .slice(0, 4);
    return { ...fact, distractors: shuffled(near).slice(0, 2) };
  });
}

/** A mixed game draws the same number of questions from each operation. */
export function drillQuestions({ facts, alternateFacts }: { facts: DrillFact[]; alternateFacts?: DrillFact[] }): DrillQuestion[] {
  const half = DRILL_ROUNDS / 2;
  const questions = alternateFacts
    ? shuffled([...selectFacts(facts, half), ...selectFacts(alternateFacts, half)])
    : selectFacts(facts, DRILL_ROUNDS);
  const positions = answerPositions(questions.length);
  return questions.map(({ distractors, ...fact }, index) => {
    const options = [...distractors];
    options.splice(positions[index], 0, fact.answer);
    return { ...fact, options };
  });
}
