import { describe, expect, it } from "vitest";
import { nearestFree, startPets, stepPet, type Pet } from "./pets";
import type { Tile } from "./rules";

const open = () => true;
const rolls = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};
const pet = (at: Tile, from: Tile = at, rest = 0): Pet => ({ kind: "cat", at, from, left: false, rest });

describe("stepPet", () => {
  it("rests out its rest, then may sit down again", () => {
    expect(stepPet(pet([3, 3], [3, 2], 2), open, rolls(0.9))).toEqual(pet([3, 3], [3, 3], 1));
    expect(stepPet(pet([3, 3]), open, rolls(0.1, 0.5))).toEqual(pet([3, 3], [3, 3], 4));
  });

  it("keeps straight on more often than not", () => {
    expect(stepPet(pet([3, 3], [2, 3]), open, rolls(0.9, 0.1)).at).toEqual([4, 3]);
  });

  it("turns back only from a dead end, and stays when shut in", () => {
    const lane = ([x, y]: Tile) => y === 0 && x <= 1;
    expect(stepPet(pet([1, 0], [0, 0]), lane, rolls(0.9, 0.9, 0)).at).toEqual([0, 0]);
    expect(stepPet(pet([5, 5]), ([x, y]) => x === 5 && y === 5, rolls(0.9))).toEqual(pet([5, 5]));
  });

  it("never leaves the ground or steps on a taken tile", () => {
    let cat = pet([0, 0]);
    const free = ([x, y]: Tile) => !(x === 1 && y === 0);
    let seed = 7;
    const roll = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 300; i++) {
      cat = stepPet(cat, free, roll);
      expect(cat.at[0]).toBeGreaterThanOrEqual(0);
      expect(cat.at[1]).toBeGreaterThanOrEqual(0);
      expect(cat.at[0]).toBeLessThan(10);
      expect(cat.at[1]).toBeLessThan(10);
      expect(free(cat.at)).toBe(true);
    }
  });

  it("walks off a tile that was taken, and looks the way it walks", () => {
    const moved = stepPet(pet([4, 4]), ([x, y]) => !(x === 4 && y === 4), rolls(0.9));
    expect(moved.from).toEqual([4, 4]);
    expect(Math.abs(moved.at[0] - 4) + Math.abs(moved.at[1] - 4)).toBe(1);
    expect(stepPet(pet([3, 3], [3, 2]), open, rolls(0.9, 0.1)).left).toBe(true);
    expect(stepPet(pet([3, 3], [2, 3]), open, rolls(0.9, 0.1)).left).toBe(false);
  });
});

describe("where pets stand", () => {
  it("finds the nearest free tile, or none", () => {
    expect(nearestFree([4, 4], open)).toEqual([4, 4]);
    expect(nearestFree([4, 4], ([x]) => x >= 6)).toEqual([6, 4]);
    expect(nearestFree([4, 4], () => false)).toBeNull();
  });

  it("starts the cat and the dog on different free tiles", () => {
    const pets = startPets(([x, y]) => x === 0 && y <= 1);
    expect(pets.map((p) => p.kind)).toEqual(["cat", "dog"]);
    expect(pets[0].at).not.toEqual(pets[1].at);
    expect(startPets(() => false)).toEqual([]);
  });
});
