import { describe, expect, it } from "vitest";
import { drawnIn, MAX_FIT, scaledSize, windowScales } from "./illustrationScale";

describe("drawnIn", () => {
  it("is the picture's size as it is drawn inside a box, its proportions kept", () => {
    expect(drawnIn({ width: 200, height: 200 }, { width: 400, height: 100 })).toEqual({ width: 200, height: 50 });
    expect(drawnIn({ width: 200, height: 100 }, { width: 50, height: 100 })).toEqual({ width: 50, height: 100 });
  });

  it("is the box itself while the picture's size is not known", () => {
    expect(drawnIn({ width: 200, height: 100 }, { width: 0, height: 0 })).toEqual({ width: 200, height: 100 });
  });
});

describe("windowScales", () => {
  it("fits the picture to the window, and enlarges it to twice that", () => {
    expect(windowScales({ width: 400, height: 200 }, { width: 800, height: 800 })).toEqual({ fitted: 2, enlarged: 4 });
    expect(windowScales({ width: 1600, height: 800 }, { width: 800, height: 800 })).toEqual({ fitted: 0.5, enlarged: 1 });
  });

  it("stops enlarging a small picture to fit", () => {
    expect(windowScales({ width: 10, height: 10 }, { width: 800, height: 800 }).fitted).toBe(MAX_FIT);
  });

  it("never opens a picture smaller than it is drawn on the page", () => {
    expect(windowScales({ width: 1000, height: 1000 }, { width: 300, height: 300 }, { width: 500, height: 500 }).fitted).toBe(0.5);
  });

  it("enlarges at least to the picture's own size", () => {
    expect(windowScales({ width: 4000, height: 4000 }, { width: 400, height: 400 }).enlarged).toBe(1);
  });
});

describe("scaledSize", () => {
  it("is in whole pixels, never less than one", () => {
    expect(scaledSize({ width: 300, height: 101 }, 0.5)).toEqual({ width: 150, height: 50 });
    expect(scaledSize({ width: 3, height: 1 }, 0.1)).toEqual({ width: 1, height: 1 });
  });

  it("does not lose a pixel to rounding", () => {
    expect(scaledSize({ width: 10, height: 10 }, 0.3 * 3).width).toBe(9);
    expect(scaledSize({ width: 100, height: 100 }, 0.57).width).toBe(57);
  });
});
