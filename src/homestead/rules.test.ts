import { describe, expect, it } from "vitest";
import { apply, bedCount, bedsFull, dayOf, freeXp, GROUND, growthOf, harvestTotal, OWNED, placeRefusal, SEEDS, seedTotal, stageOf, starter, stockOf, thingAt, type Action, type Homestead, type Quality } from "./rules";

const TODAY = "2026-03-04";

/** Applies changes one after another; every one of them has to be allowed. */
function after(home: Homestead, earned: number, ...actions: Action[]): Homestead {
  return actions.reduce((current, action) => {
    const result = apply(current, action, earned, TODAY);
    if (!result.ok) throw new Error(`${action.action} refused: ${result.reason}`);
    return result.home;
  }, home);
}
const reasonOf = (home: Homestead, action: Action, earned = 0) => {
  const result = apply(home, action, earned, TODAY);
  return result.ok ? null : result.reason;
};
/** A homestead with a turnip of a quality growing in the first bed. */
const planted = (seed: Quality, earned = 1000) => after(starter(), earned, { action: "buy", seed }, { action: "plant", at: [2, 5], seed });

describe("the starter homestead", () => {
  it("starts with a free seed and spare beds, bushes and poultry", () => {
    const home = starter();
    expect(home.seeds).toEqual({ common: 1 });
    expect(home.spent).toBe(0);
    expect(stockOf(home, "bed")).toBe(1);
    for (const kind of ["house", "barn", "fence", "tree", "cat", "dog", "cow", "pond"] as const) expect(stockOf(home, kind)).toBe(0);
    expect(stockOf(home, "chicken")).toBe(1);
    expect(stockOf(home, "bush")).toBe(2);
    expect(home.things).toHaveLength(Object.values(OWNED).reduce((sum, n) => sum + n, 0) - 4);
  });

  it("has no two things on one tile", () => {
    const home = starter();
    for (const thing of home.things) expect(placeRefusal(home.things, thing.kind, thing.x, thing.y, thing)).toBeNull();
  });
});

describe("a turnip's stages", () => {
  it("begin at these amounts for a common turnip", () => {
    expect([0, 11, 12, 50, 88, 89, 99, 100].map((given) => stageOf(100, given))).toEqual([1, 1, 2, 5, 8, 9, 9, 10]);
  });

  it("say how far the stage has got and when the turnip is ripe", () => {
    expect(growthOf({ type: "common", given: 0 })).toMatchObject({ stage: 1, ripe: false, since: 0, span: 12, left: 100 });
    expect(growthOf({ type: "common", given: 50 })).toMatchObject({ stage: 5, since: 5, span: 11, left: 50 });
    expect(growthOf({ type: "legendary", given: 400 })).toMatchObject({ stage: 10, ripe: true, left: 0 });
  });
});

describe("buying a seed", () => {
  it("spends its price and adds the seed", () => {
    const home = after(starter(), 150, { action: "buy", seed: "epic" });
    expect(home.seeds).toEqual({ common: 1, epic: 1 });
    expect(home.spent).toBe(SEEDS.epic.price);
    expect(freeXp(home, 150)).toBe(50);
  });

  it("is refused when the free experience does not cover the price", () => {
    expect(reasonOf(starter(), { action: "buy", seed: "epic" }, 70)).toBe("not_enough_xp");
    const spent = after(starter(), 100, { action: "buy", seed: "epic" });
    expect(reasonOf(spent, { action: "buy", seed: "common" }, 100)).toBe("not_enough_xp");
  });

  it("does not wait for a free bed", () => {
    let home = after(starter(), 1000, { action: "place", kind: "bed", x: 5, y: 5 });
    for (const at of [[2, 5], [3, 5], [4, 5], [5, 5]] as const) home = after(home, 1000, { action: "buy", seed: "common" }, { action: "plant", at: [...at], seed: "common" });
    expect(bedsFull(home)).toBe(true);
    expect(after(home, 1000, { action: "buy", seed: "rare" }).seeds.rare).toBe(1);
  });
});

describe("the beds", () => {
  it("are full only when each one on the ground is planted and none waits in stock", () => {
    const plantAll = (home: Homestead, ...beds: [number, number][]) => beds.reduce((h, at) => after(h, 1000, { action: "buy", seed: "common" }, { action: "plant", at, seed: "common" }), home);
    const three = plantAll(starter(), [2, 5], [3, 5], [4, 5]);
    // The fourth bed is still in stock.
    expect(bedsFull(three)).toBe(false);
    const placed = after(three, 1000, { action: "place", kind: "bed", x: 5, y: 5 });
    expect(bedsFull(placed)).toBe(false);
    expect(bedsFull(plantAll(placed, [5, 5]))).toBe(true);
    expect(bedCount(placed)).toBe(4);
    expect(seedTotal(placed)).toBe(1);
  });
});

describe("planting", () => {
  it("takes the seed and starts a turnip with nothing given", () => {
    const home = after(starter(), 0, { action: "plant", at: [2, 5], seed: "common" });
    expect(home.seeds).toEqual({});
    expect(thingAt(home, 2, 5)?.turnip).toEqual({ type: "common", given: 0 });
  });

  it("is refused without a seed of that quality, in a planted bed, and anywhere but a bed", () => {
    expect(reasonOf(starter(), { action: "plant", at: [2, 5], seed: "legendary" })).toBe("no_seed");
    expect(reasonOf(planted("rare"), { action: "plant", at: [2, 5], seed: "common" })).toBe("bed_planted");
    expect(reasonOf(starter(), { action: "plant", at: [3, 3], seed: "common" })).toBe("unknown_thing");
    expect(reasonOf(starter(), { action: "plant", at: [5, 8], seed: "common" })).toBe("unknown_thing");
  });
});

describe("growing a turnip", () => {
  it("gives what was asked and spends it", () => {
    const result = apply(planted("rare"), { action: "grow", at: [2, 5], amount: 50 }, 1000, TODAY);
    expect(result).toMatchObject({ ok: true, given: 50 });
    if (!result.ok) return;
    expect(thingAt(result.home, 2, 5)?.turnip).toEqual({ type: "rare", given: 50 });
    expect(result.home.spent).toBe(SEEDS.rare.price + 50);
  });

  it("never gives more than the turnip still needs, and dates the day it ripens", () => {
    const home = after(planted("common"), 1000, { action: "grow", at: [2, 5], amount: 50 }, { action: "grow", at: [2, 5], amount: 45 });
    const result = apply(home, { action: "grow", at: [2, 5], amount: 10 }, 1000, TODAY);
    expect(result).toMatchObject({ ok: true, given: 5 });
    if (!result.ok) return;
    expect(thingAt(result.home, 2, 5)?.turnip).toEqual({ type: "common", given: 100, ripened: TODAY });
    expect(reasonOf(result.home, { action: "grow", at: [2, 5], amount: 10 }, 1000)).toBe("turnip_ripe");
  });

  it("never gives more than the free experience, and nothing when there is none", () => {
    const home = planted("common", 25 + 7);
    const result = apply(home, { action: "grow", at: [2, 5], amount: 10 }, 25 + 7, TODAY);
    expect(result).toMatchObject({ ok: true, given: 7 });
    expect(result.ok && reasonOf(result.home, { action: "grow", at: [2, 5], amount: 10 }, 25 + 7)).toBe("no_xp");
  });

  it("is refused in an empty bed", () => {
    expect(reasonOf(starter(), { action: "grow", at: [2, 5], amount: 10 }, 100)).toBe("bed_empty");
  });

  it("gives whole experience only, and refuses an amount that gives none", () => {
    expect(apply(planted("common"), { action: "grow", at: [2, 5], amount: 10.7 }, 1000, TODAY)).toMatchObject({ ok: true, given: 10 });
    for (const amount of [0, 0.5, -10, NaN]) expect(reasonOf(planted("common"), { action: "grow", at: [2, 5], amount }, 1000)).toBe("no_xp");
  });
});

describe("gathering", () => {
  const ripe = () => after(planted("common"), 1000, { action: "grow", at: [2, 5], amount: 100 });

  it("moves a ripe turnip to the harvest and frees its bed", () => {
    const home = after(ripe(), 1000, { action: "gather", at: [2, 5] });
    expect(home.harvest).toEqual({ common: { count: 1, latest: TODAY } });
    expect(thingAt(home, 2, 5)).toEqual({ kind: "bed", x: 2, y: 5, rot: 0 });
    expect(harvestTotal(home)).toBe(1);
  });

  it("keeps the latest day a turnip of the quality ripened", () => {
    const first = after(ripe(), 1000, { action: "gather", at: [2, 5] });
    const again = after(first, 1000, { action: "buy", seed: "common" }, { action: "plant", at: [2, 5], seed: "common" });
    const grown = apply(again, { action: "grow", at: [2, 5], amount: 100 }, 1000, "2026-01-01");
    const home = grown.ok ? after(grown.home, 1000, { action: "gather", at: [2, 5] }) : again;
    expect(home.harvest.common).toEqual({ count: 2, latest: TODAY });
  });

  it("dates the harvest by the day the turnip ripened, not the day it was gathered", () => {
    const grown = apply(planted("common"), { action: "grow", at: [2, 5], amount: 100 }, 1000, "2026-01-01");
    if (!grown.ok) throw new Error(grown.reason);
    expect(after(grown.home, 1000, { action: "gather", at: [2, 5] }).harvest.common).toEqual({ count: 1, latest: "2026-01-01" });
  });

  it("counts each quality apart", () => {
    const home = after(ripe(), 1000, { action: "gather", at: [2, 5] }, { action: "buy", seed: "rare" }, { action: "plant", at: [3, 5], seed: "rare" }, { action: "grow", at: [3, 5], amount: 200 }, { action: "gather", at: [3, 5] });
    expect(home.harvest).toEqual({ common: { count: 1, latest: TODAY }, rare: { count: 1, latest: TODAY } });
    expect(harvestTotal(home)).toBe(2);
  });

  it("is refused for a growing turnip and an empty bed", () => {
    expect(reasonOf(planted("common"), { action: "gather", at: [2, 5] })).toBe("not_ripe");
    expect(reasonOf(starter(), { action: "gather", at: [2, 5] })).toBe("bed_empty");
  });
});

describe("arranging the ground", () => {
  it("places the fourth bed from stock, and no fifth", () => {
    const home = after(starter(), 0, { action: "place", kind: "bed", x: 5, y: 5 });
    expect(stockOf(home, "bed")).toBe(0);
    expect(reasonOf(home, { action: "place", kind: "bed", x: 6, y: 6 })).toBe("not_in_stock");
  });

  it("refuses a place off the ground or on a taken tile", () => {
    const home = after(starter(), 0, { action: "stock", at: [3, 3] });
    expect(reasonOf(home, { action: "place", kind: "bush", x: GROUND, y: 0 })).toBe("outside_ground");
    expect(reasonOf(home, { action: "place", kind: "bush", x: 2, y: 2 })).toBe("tile_taken");
    expect(reasonOf(home, { action: "move", from: [1, 1], x: GROUND - 1, y: GROUND - 1 })).toBe("outside_ground");
    expect(reasonOf(home, { action: "move", from: [0, 0], x: 4, y: 3 })).toBe("tile_taken");
  });

  it("moves a thing, named by any tile it covers, onto tiles it partly covers already", () => {
    const home = after(starter(), 0, { action: "move", from: [7, 2], x: 7, y: 2 });
    expect(thingAt(home, 8, 3)?.kind).toBe("barn");
    expect(thingAt(home, 6, 1)).toBeUndefined();
  });

  it("moves a bed with its turnip", () => {
    const home = after(planted("rare"), 1000, { action: "move", from: [2, 5], x: 7, y: 7 });
    expect(thingAt(home, 7, 7)?.turnip).toEqual({ type: "rare", given: 0 });
  });

  it("turns a fence and nothing else", () => {
    const home = after(starter(), 0, { action: "rotate", at: [0, 0] });
    expect(thingAt(home, 0, 0)?.rot).toBe(1);
    expect(thingAt(after(home, 0, { action: "rotate", at: [0, 0] }), 0, 0)?.rot).toBe(0);
    expect(reasonOf(starter(), { action: "rotate", at: [9, 3] })).toBe("not_rotatable");
    const stocked = after(starter(), 0, { action: "stock", at: [9, 3] });
    expect(reasonOf(stocked, { action: "place", kind: "tree", x: 9, y: 3, rot: 1 })).toBe("not_rotatable");
  });

  it("puts a thing back in stock and frees its footprint", () => {
    const home = after(starter(), 0, { action: "stock", at: [1, 1] });
    expect(stockOf(home, "house")).toBe(1);
    expect(thingAt(home, 2, 2)).toBeUndefined();
    expect(reasonOf(starter(), { action: "stock", at: [5, 8] })).toBe("unknown_thing");
  });

  it("leaves the homestead it was given untouched", () => {
    const home = starter();
    const copy = structuredClone(home);
    after(home, 1000, { action: "buy", seed: "rare" }, { action: "plant", at: [2, 5], seed: "rare" }, { action: "grow", at: [2, 5], amount: 10 }, { action: "move", from: [0, 0], x: 5, y: 5 });
    expect(home).toEqual(copy);
  });
});

describe("dayOf", () => {
  it("is the local calendar day", () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
