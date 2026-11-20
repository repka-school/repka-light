import { expect, it, vi } from "vitest";
import { drillQuestions } from "./drill";

const facts = Array.from({ length: 10 }, (_, index) => ({ prompt: `2 + ${index + 1}`, answer: index + 3 }));
const subtraction = facts.map(({ answer }) => ({ prompt: `${answer} − 2`, answer: answer - 2 }));

it.each([
  { name: "single-operation", facts },
  { name: "mixed", facts, alternateFacts: subtraction },
])("balances answer keys and prevents triples in a $name game", (drill) => {
  // Independent shuffles with this random source used to give every answer the same key.
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  try {
    const positions = drillQuestions(drill).map(({ answer, options }) => options.indexOf(answer));
    const counts = [0, 1, 2].map((key) => positions.filter((position) => position === key).length);
    expect(counts.sort()).toEqual([3, 3, 4]);
    expect(positions.some((key, index) => key === positions[index - 1] && key === positions[index - 2])).toBe(false);
  } finally {
    random.mockRestore();
  }
});
