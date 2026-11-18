import { describe, expect, it } from "vitest";
import { apply, starter, type Action, type Homestead, type Tile } from "./rules";
import { afterOutcome, firstTile, fitsHere, intentAt, marksOf, modeLasts, moveCursor, startTile, type Outcome } from "./screen";

function after(home: Homestead, ...actions: Action[]): Homestead {
  return actions.reduce((current, action) => {
    const result = apply(current, action, 5000, "2026-03-04");
    if (!result.ok) throw new Error(`${action.action} refused: ${result.reason}`);
    return result.home;
  }, home);
}
const growing = () => after(starter(), { action: "plant", at: [2, 5], seed: "common" });
const ripe = () => after(growing(), { action: "grow", at: [2, 5], amount: 100 });

describe("intentAt", () => {
  it("selects a thing and does nothing on empty ground without a tool", () => {
    expect(intentAt(starter(), null, [2, 2])).toEqual({ kind: "select" });
    expect(intentAt(starter(), null, [5, 8])).toEqual({ kind: "none" });
  });

  it("grows a growing turnip by the small step, and only that", () => {
    expect(intentAt(growing(), { mode: "grow" }, [2, 5])).toEqual({ kind: "act", action: { action: "grow", at: [2, 5], amount: 10 } });
    expect(intentAt(ripe(), { mode: "grow" }, [2, 5])).toEqual({ kind: "select" });
    expect(intentAt(growing(), { mode: "grow" }, [3, 5])).toEqual({ kind: "select" });
  });

  it("plants in an empty bed", () => {
    expect(intentAt(starter(), { mode: "seed", type: "common" }, [3, 5])).toEqual({ kind: "act", action: { action: "plant", at: [3, 5], seed: "common" } });
    expect(intentAt(growing(), { mode: "seed", type: "common" }, [2, 5])).toEqual({ kind: "select" });
  });

  it("places where the thing fits and says why where it does not", () => {
    expect(intentAt(starter(), { mode: "place", kind: "bed", rot: 0 }, [5, 8])).toEqual({ kind: "act", action: { action: "place", kind: "bed", x: 5, y: 8, rot: 0 } });
    expect(intentAt(starter(), { mode: "place", kind: "bed", rot: 0 }, [2, 5])).toEqual({ kind: "refuse", reason: "tile_taken" });
  });

  it("moves a thing over its own tiles but not off the ground", () => {
    const move = { mode: "move", from: [6, 1] as Tile, kind: "barn" } as const;
    expect(intentAt(starter(), move, [7, 2])).toEqual({ kind: "act", action: { action: "move", from: [6, 1], x: 7, y: 2 } });
    expect(intentAt(starter(), move, [9, 9])).toEqual({ kind: "refuse", reason: "outside_ground" });
    expect(fitsHere(starter(), move, [7, 2])).toBe(true);
    expect(fitsHere(starter(), move, [1, 1])).toBe(false);
    expect(fitsHere(starter(), { mode: "grow" }, [2, 2])).toBeNull();
  });
});

describe("modeLasts", () => {
  it("ends a tool that has nothing left to use", () => {
    expect(modeLasts(growing(), { mode: "grow" }, 0)).toBe(false);
    expect(modeLasts(growing(), { mode: "grow" }, 5)).toBe(true);
    expect(modeLasts(starter(), { mode: "seed", type: "common" }, 0)).toBe(true);
    expect(modeLasts(growing(), { mode: "seed", type: "common" }, 0)).toBe(false);
    expect(modeLasts(starter(), { mode: "place", kind: "bed", rot: 0 }, 0)).toBe(true);
    expect(modeLasts(starter(), { mode: "place", kind: "tree", rot: 0 }, 0)).toBe(false);
    expect(modeLasts(starter(), { mode: "move", from: [5, 8], kind: "bush" }, 0)).toBe(false);
  });
});

describe("marksOf", () => {
  it("marks the beds a tool can be used on", () => {
    expect([...marksOf(growing(), { mode: "seed", type: "rare" }, [0, 0], null)]).toEqual([["3,5", "target"], ["4,5", "target"]]);
    expect([...marksOf(growing(), { mode: "grow" }, [0, 0], null)]).toEqual([["2,5", "target"]]);
  });

  it("marks a footprint at the cursor as fitting or not", () => {
    const stocked = after(starter(), { action: "stock", at: [6, 1] });
    expect([...marksOf(stocked, { mode: "place", kind: "barn", rot: 0 }, [6, 1], null).values()]).toEqual(["fits", "fits", "fits", "fits"]);
    expect([...marksOf(stocked, { mode: "place", kind: "barn", rot: 0 }, [2, 2], null).values()]).toEqual(["blocked", "blocked", "blocked", "blocked"]);
  });

  it("marks every tile of the selected thing", () => {
    expect([...marksOf(starter(), null, [0, 0], [2, 2]).keys()]).toEqual(["1,1", "2,1", "1,2", "2,2"]);
    expect(marksOf(starter(), null, [0, 0], [5, 8]).size).toBe(0);
  });
});

describe("the cursor", () => {
  it("starts on the first bed and stays on the ground", () => {
    expect(firstTile(starter())).toEqual([2, 5]);
    expect(moveCursor([0, 0], "ArrowLeft")).toEqual([0, 0]);
    expect(moveCursor([9, 9], "ArrowDown")).toEqual([9, 9]);
    expect(moveCursor([4, 4], "ArrowRight")).toEqual([5, 4]);
    expect(moveCursor([4, 4], "Enter")).toBeNull();
  });

  it("goes to the first bed a tool can be used on", () => {
    expect(startTile(growing(), { mode: "seed", type: "rare" }, [0, 0])).toEqual([3, 5]);
    expect(startTile(growing(), { mode: "grow" }, [0, 0])).toEqual([2, 5]);
    expect(startTile(starter(), { mode: "grow" }, [7, 7])).toEqual([7, 7]);
  });
});

describe("afterOutcome", () => {
  const bed = { kind: "bed", x: 2, y: 5, rot: 0 } as const;
  const done = (home: Homestead, action: Action, extra: Partial<Extract<Outcome, { ok: true }>> = {}): Outcome => ({ ok: true, action, home, given: 0, free: 100, thing: bed, ...extra });

  it("keeps focus on the grow button while the turnip can take more", () => {
    const home = after(growing(), { action: "grow", at: [2, 5], amount: 10 });
    expect(afterOutcome(done(home, { action: "grow", at: [2, 5], amount: 10 }, { given: 10 }))).toEqual({ said: { key: "grown", given: 10, stage: 1, ripe: false }, focus: { to: "stay" }, close: false });
  });

  it("moves focus to the scene when the turnip ripens or the experience runs out", () => {
    expect(afterOutcome(done(ripe(), { action: "grow", at: [2, 5], amount: 50 }, { given: 50 }))).toMatchObject({ said: { key: "grown", stage: 10, ripe: true }, focus: { to: "scene", tile: [2, 5] } });
    const home = after(growing(), { action: "grow", at: [2, 5], amount: 10 });
    expect(afterOutcome(done(home, { action: "grow", at: [2, 5], amount: 10 }, { given: 10, free: 0 })).focus).toEqual({ to: "scene", tile: [2, 5] });
  });

  it("closes the card of a thing put in stock", () => {
    expect(afterOutcome(done(starter(), { action: "stock", at: [2, 5] }))).toEqual({ said: { key: "stocked", kind: "bed" }, focus: { to: "scene", tile: [2, 5] }, close: true });
  });

  it("puts the cursor where a thing was placed or moved to", () => {
    expect(afterOutcome(done(starter(), { action: "place", kind: "bed", x: 5, y: 8 })).focus).toEqual({ to: "scene", tile: [5, 8] });
    expect(afterOutcome(done(starter(), { action: "move", from: [2, 5], x: 7, y: 7 }))).toMatchObject({ said: { key: "placed", kind: "bed" }, focus: { to: "scene", tile: [7, 7] } });
  });

  it("says what a purchase left, and what one that was refused lacks", () => {
    expect(afterOutcome(done(starter(), { action: "buy", seed: "epic" }, { free: 50, thing: undefined })).said).toEqual({ key: "bought", seed: "epic", left: 50 });
    expect(afterOutcome({ ok: false, action: { action: "buy", seed: "epic" }, reason: "not_enough_xp", free: 70 })).toEqual({ said: { key: "short", lack: 30 }, focus: { to: "stay" }, close: false });
  });

  it("returns to the scene after a refused placement", () => {
    expect(afterOutcome({ ok: false, action: { action: "place", kind: "bed", x: 2, y: 5 }, reason: "tile_taken", free: 0 })).toEqual({ said: { key: "refused", reason: "tile_taken" }, focus: { to: "scene", tile: undefined }, close: false });
    expect(afterOutcome({ ok: false, action: { action: "gather", at: [2, 5] }, reason: "not_ripe", free: 0 }).focus).toEqual({ to: "stay" });
  });
});
