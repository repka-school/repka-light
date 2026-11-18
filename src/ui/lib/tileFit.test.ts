import { describe, expect, it } from "vitest";
import { lineCount, rowFits, wordCount, type TileBox } from "./tileFit";

const box = (patch: Partial<TileBox> = {}): TileBox => ({ scrollWidth: 100, clientWidth: 100, lines: 1, words: 1, ...patch });

describe("rowFits", () => {
  it("fits one-line tiles, and two-line tiles of at most two words", () => {
    expect(rowFits([box(), box({ lines: 2, words: 2 })])).toBe(true);
    expect(rowFits([box(), box({ lines: 2, words: 3 })])).toBe(false);
    expect(rowFits([box({ lines: 3, words: 2 })])).toBe(false);
  });

  it("does not fit a tile whose text overflows, a pixel of rounding aside", () => {
    expect(rowFits([box({ scrollWidth: 101 })])).toBe(true);
    expect(rowFits([box({ scrollWidth: 102 })])).toBe(false);
  });

  it("does not fit when there is nothing to measure", () => {
    expect(rowFits([])).toBe(false);
  });
});

describe("lineCount", () => {
  const rect = (top: number, bottom: number) => ({ top, bottom });

  it("counts the pieces that stand on one line once", () => {
    expect(lineCount([])).toBe(0);
    expect(lineCount([rect(0, 20), rect(0, 20), rect(24, 44)])).toBe(2);
  });

  it("keeps a piece on the line it sits mostly inside, and starts a new line otherwise", () => {
    expect(lineCount([rect(0, 20), rect(6, 18)])).toBe(1);
    expect(lineCount([rect(0, 20), rect(12, 32)])).toBe(2);
  });

  it("takes the pieces from the top, in whatever order they come", () => {
    expect(lineCount([rect(48, 68), rect(0, 20), rect(24, 44)])).toBe(3);
  });
});

describe("wordCount", () => {
  it("counts words, whatever the spaces around them", () => {
    expect(wordCount("  два\n слова ")).toBe(2);
    expect(wordCount("")).toBe(0);
  });
});
