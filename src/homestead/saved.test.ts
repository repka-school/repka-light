import { describe, expect, it } from "vitest";
import { apply, GROUND, starter, stockOf, thingAt, type Action, type Homestead } from "./rules";
import { pack, unpack } from "./saved";

function after(home: Homestead, ...actions: Action[]): Homestead {
  return actions.reduce((current, action) => {
    const result = apply(current, action, 5000, "2026-03-04");
    if (!result.ok) throw new Error(`${action.action} refused: ${result.reason}`);
    return result.home;
  }, home);
}

/** A homestead with a bit of everything: a turned fence, a growing and a ripe turnip, a seed held and a harvest. */
const played = () =>
  after(
    starter(),
    { action: "rotate", at: [9, 0] },
    { action: "buy", seed: "rare" },
    { action: "buy", seed: "epic" },
    { action: "plant", at: [2, 5], seed: "common" },
    { action: "grow", at: [2, 5], amount: 100 },
    { action: "gather", at: [2, 5] },
    { action: "plant", at: [2, 5], seed: "rare" },
    { action: "grow", at: [2, 5], amount: 40 },
    { action: "buy", seed: "common" },
    { action: "plant", at: [3, 5], seed: "common" },
    { action: "grow", at: [3, 5], amount: 100 },
  );

describe("pack", () => {
  it("keeps a thing as a short list", () => {
    const { things, seeds, spent, harvest } = pack(played());
    expect(things).toContainEqual(["house", 1, 1]);
    expect(things).toContainEqual(["fence", 9, 0, 1]);
    expect(things).toContainEqual(["bed", 2, 5, "rare", 40]);
    expect(things).toContainEqual(["bed", 3, 5, "common", 100, "2026-03-04"]);
    expect(things).toContainEqual(["bed", 4, 5]);
    expect(seeds).toEqual({ epic: 1 });
    expect(harvest).toEqual({ common: [1, "2026-03-04"] });
    expect(spent).toBe(50 + 100 + 100 + 40 + 25 + 100);
  });

  it("stores each planted bed with its growth and ripening date until placed again", () => {
    const home = played();
    const stored = after(home, { action: "stock", at: [3, 5] }, { action: "stock", at: [2, 5] });
    const restored = unpack(JSON.parse(JSON.stringify(pack(stored))))!;
    expect(restored).toEqual(stored);
    const placed = after(restored, { action: "place", kind: "bed", x: 2, y: 11 }, { action: "place", kind: "bed", x: 3, y: 11 });
    expect(thingAt(placed, 2, 11)?.turnip).toEqual(thingAt(home, 3, 5)?.turnip);
    expect(thingAt(placed, 3, 11)?.turnip).toEqual(thingAt(home, 2, 5)?.turnip);
    expect(placed.storedCrops).toBeUndefined();
    expect(placed.spent).toBe(home.spent);
  });

  it("round-trips through JSON", () => {
    const home = played();
    expect(unpack(JSON.parse(JSON.stringify(pack(home))))).toEqual(home);
    expect(unpack(JSON.parse(JSON.stringify(pack(starter()))))).toEqual(starter());
  });
});

describe("unpack", () => {
  it("is nothing for what is not a homestead", () => {
    for (const raw of [undefined, null, 7, "x", []]) expect(unpack(raw)).toBeUndefined();
  });

  it("starts from the starter layout when the things are missing", () => {
    expect(unpack({ spent: 30 })).toEqual({ ...starter(), spent: 30, seeds: {} });
  });

  it("drops what the rules would not allow, which puts it back in stock", () => {
    const home = unpack({
      spent: -5,
      seeds: { common: 2, rare: -1, epic: 1.5, golden: 3 },
      things: [
        ["house", 1, 1],
        ["house", 5, 5],
        ["barn", 2, 2],
        ["tree", GROUND, 0],
        ["bush", 0.5, 0],
        ["well", 0, 0],
        "fence",
        ["fence", 0, 0, 1],
        ["fence", 0, 0],
        ["tree", 9, 9, 1],
        ["bed", 4, 4, "rare", 9999, "2026-03-04"],
        ["bed", 5, 4, "common", 100, "yesterday"],
        ["bed", 6, 4, "golden", 10],
        ["bed", 7, 4, "epic", -3, "2026-03-04"],
      ],
      harvest: { common: [2, "2026-03-04"], rare: [0, "2026-03-04"], epic: "many", legendary: [1, 5] },
    })!;
    expect(home.spent).toBe(0);
    expect(home.seeds).toEqual({ common: 2 });
    expect(home.things).toEqual([
      { kind: "house", x: 1, y: 1, rot: 0 },
      { kind: "fence", x: 0, y: 0, rot: 1 },
      { kind: "tree", x: 9, y: 9, rot: 0 },
      { kind: "bed", x: 4, y: 4, rot: 0, turnip: { type: "rare", given: 200, ripened: "2026-03-04" } },
      { kind: "bed", x: 5, y: 4, rot: 0, turnip: { type: "common", given: 100 } },
      { kind: "bed", x: 6, y: 4, rot: 0 },
      { kind: "bed", x: 7, y: 4, rot: 0, turnip: { type: "epic", given: 0 } },
    ]);
    expect(stockOf(home, "barn")).toBe(1);
    expect(thingAt(home, 5, 5)).toBeUndefined();
    expect(home.harvest).toEqual({ common: { count: 2, latest: "2026-03-04" }, legendary: { count: 1, latest: "" } });
  });
});
