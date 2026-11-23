import { describe, expect, it } from "vitest";
import { advance, advanceWalkers, blockedTiles, planWalk, poseOf, residents, startWalker, type Walker } from "./pets";
import { starter, tileKey, type Kind, type Thing, type Tile } from "./rules";

describe("pet walks", () => {
  it("takes a connected multi-tile outing, then returns to its own door during rain", () => {
    const blocked = blockedTiles(starter().things);
    for (const kind of ["cat", "dog"] as const) {
      const shelter = starter().things.find((t) => t.kind === kind)!;
      const home: Tile = [shelter.x, shelter.y];
      const pet = startWalker(kind, home, false);
      for (let i = 0; i < 2400; i++) {
        advance(pet, 1/30, false, blocked, () => .42);
        if (Math.abs(pet.at.tile[0]-home[0])+Math.abs(pet.at.tile[1]-home[1]) >= 3) break;
      }
      expect(Math.abs(pet.at.tile[0]-home[0])+Math.abs(pet.at.tile[1]-home[1])).toBeGreaterThanOrEqual(3);
      let previous = poseOf(pet);
      for (let i = 0; i < 2400 && !pet.at.inside; i++) {
        advance(pet, 1/30, true, blocked);
        const pose = poseOf(pet);
        expect(Math.hypot(pose.x-previous.x, pose.y-previous.y)).toBeLessThan(1);
        if (pet.step && tileKey(...pet.step.to.tile) !== tileKey(...home)) expect(blocked.has(tileKey(...pet.step.to.tile))).toBe(false);
        previous = pose;
      }
      expect(pet.at).toEqual({ tile: home, inside: true });
    }
  });

  it("keeps the walking pose and direction through a tile boundary", () => {
    const cat = startWalker("cat", [2, 2], false);
    cat.at.tile = [3, 2];
    cat.route = [[4, 2], [5, 2]];
    cat.wait = 0;
    const blocked = new Set<string>();
    advance(cat, .1, false, blocked);
    const approach = poseOf(cat);
    expect(approach.walking).toBe(true);

    advance(cat, 3, false, blocked);
    const boundary = poseOf(cat);
    expect(boundary.walking).toBe(true);
    expect(boundary.left).toBe(approach.left);
    advance(cat, 0, false, blocked);
    expect(poseOf(cat)).toEqual(boundary);
  });

  it("finds the gap in a fence and waits outside if that gap is closed", () => {
    const blocked = new Set(Array.from({length:12}, (_, y) => tileKey(3,y)));
    blocked.delete(tileKey(3,4));
    const home: Tile = [2,2], start: Tile = [5,2];
    expect(planWalk(start, home, blocked, true)).toContainEqual([3,4]);
    blocked.add(tileKey(3,4));
    expect(planWalk(start, home, blocked, true)).toEqual([[4,2]]);
    expect(planWalk([4,2], home, blocked, true)).toEqual([]);
  });

  it("replans a pet's next step when a fence is placed in its path", () => {
    for (const kind of ["cat", "dog"] as const) {
      const home: Tile = [2, 2];
      const things = [at(kind, ...home)];
      const animal = residents(things, false, [])[0];
      animal.wait = 0;
      advance(animal, .2, false, blockedTiles(things), () => .35);
      const destination = animal.step!.to.tile;
      const fenced = [...things, at("fence", ...destination)];
      const [replanned] = residents(fenced, false, [animal]);
      expect(replanned.step).toBeNull();
      expect(replanned.at.tile).toEqual(home);
      for (let i = 0; i < 120; i++) {
        advance(replanned, .1, false, blockedTiles(fenced), () => .35);
        expect(replanned.at.tile).not.toEqual(destination);
        expect(replanned.step?.to.tile).not.toEqual(destination);
      }
    }
  });
});

const at = (kind: Kind, x: number, y: number): Thing => ({ kind, x, y, rot: 0 });
const residentsOfBarn = [at("chicken", 4, 6), at("chicken", 6, 6), at("cow", 7, 6), at("barn", 3, 2)];

function tick(animals: Walker[], things: Thing[], rain: boolean) {
  advanceWalkers(animals, .1, rain, blockedTiles(things), () => .3);
}

describe("farm animals", () => {
  it("lets hens explore, the cow graze at home, and all three share the barn doors during rain", () => {
    const animals = residents(residentsOfBarn, false, []);
    const cow = animals.find((animal) => animal.kind === "cow")!;
    for (let i = 0; i < 100; i++) tick(animals, residentsOfBarn, false);
    expect(cow.at.tile).toEqual(cow.home);
    expect(cow.step).toBeNull();
    expect(animals.filter((animal) => animal.kind === "chicken").every((hen) => hen.step || tileKey(...hen.at.tile) !== tileKey(...hen.home))).toBe(true);

    let crossing = false;
    for (let i = 0; i < 800 && !animals.every((animal) => animal.at.inside); i++) {
      const cowBefore = poseOf(cow);
      tick(animals, residentsOfBarn, true);
      const cowAfter = poseOf(cow);
      expect(Math.hypot(cowAfter.x - cowBefore.x, cowAfter.y - cowBefore.y)).toBeLessThan(2.3);
      if (cow.step?.to.inside) {
        expect(cow.at.inside).toBe(false);
        crossing = true;
      }
    }
    expect(crossing).toBe(true);
    for (const animal of animals) {
      expect(animal.at.inside).toBe(true);
      expect([[5, 2], [5, 3]]).toContainEqual(animal.at.tile);
    }

    for (let i = 0; i < 600; i++) tick(animals, residentsOfBarn, false);
    expect(animals.every((animal) => !animal.at.inside)).toBe(true);
    expect(cow.at.tile).toEqual(cow.home);
    expect(cow.step).toBeNull();
  });

  it("lets the chickens through a shared exit before the cow returns to graze on the doorstep", () => {
    const things = [at("cow", 5, 2), at("chicken", 5, 4), at("chicken", 4, 5), at("barn", 3, 2), at("fence", 5, 3)];
    const animals = residents(things, true, []);
    expect(animals.every((animal) => animal.at.inside && tileKey(...animal.at.tile) === "5,2")).toBe(true);
    for (let i = 0; i < 400; i++) tick(animals, things, false);
    expect(animals.every((animal) => !animal.at.inside)).toBe(true);
    expect(animals[0].at.tile).toEqual(animals[0].home);
    expect(animals[0].step).toBeNull();
  });

  it("returns every animal at a shared doorway to its own place when its barn is stocked", () => {
    const things = [...residentsOfBarn, at("fence", 5, 3)];
    const animals = residents(things, true, []);
    expect(animals.every((animal) => animal.at.inside && tileKey(...animal.at.tile) === "5,2")).toBe(true);
    // Catch a hen half way across the same threshold too.
    animals[0].at.inside = false;
    advance(animals[0], .1, true, blockedTiles(things));
    expect(animals[0].step?.to.inside).toBe(true);
    const visible = residents(things.filter((thing) => thing.kind !== "barn"), true, animals);
    for (const animal of visible) {
      expect(animal.at).toEqual({ tile: animal.home, inside: false });
      expect(animal.step).toBeNull();
    }
  });

  it("requires a reachable doorway for a rainy reduced-motion visit or a walk", () => {
    const things = [at("cow", 6, 4), at("barn", 3, 2), at("fence", 5, 2)];
    for (const reduced of [false, true]) {
      expect(residents(things, true, [], reduced)[0].at).toEqual({ tile: [5, 3], inside: true });
    }
    const sheltered = residents(things, true, [], true);
    expect(residents(things, false, sheltered, true)[0].at).toEqual({ tile: [6, 4], inside: false });
    const fenced = [...things, at("fence", 5, 3)];
    for (const layout of [fenced, [at("cow", 6, 4)], [at("cow", 6, 4), at("barn", 10, 2)]]) {
      expect(residents(layout, true, [], true)[0].at.inside).toBe(false);
      const animals = residents(layout, true, []);
      for (let i = 0; i < 60; i++) tick(animals, layout, true);
      expect(animals[0].at).toEqual({ tile: [6, 4], inside: false });
    }
  });

  it.each([false, true])("carries sheltered animals with a moved barn, reduced motion %s", (reduced) => {
    const things = residentsOfBarn.filter((thing) => thing.kind !== "barn");
    const moved = [...things, at("barn", 7, 3)];
    let animals = residents(residentsOfBarn, true, [], reduced);
    expect(animals.every((animal) => animal.at.inside && animal.at.tile[0] === 5)).toBe(true);
    animals = residents(moved, true, animals, reduced);
    for (let i = 0; i < 3; i++) {
      for (const animal of animals) {
        expect(animal.at.inside).toBe(true);
        expect(animal.step).toBeNull();
        expect([[9, 3], [9, 4]]).toContainEqual(animal.at.tile);
        expect(poseOf(animal).shelter).toBe(1);
      }
      if (!reduced) tick(animals, moved, true);
      animals = residents(moved, true, animals, reduced);
    }

    animals = residents(moved, false, animals, reduced);
    if (!reduced) {
      const leaving = new Set<Walker>();
      for (let i = 0; i < 800; i++) {
        tick(animals, moved, false);
        for (const animal of animals) if (animal.at.inside && animal.step && !animal.step.to.inside) {
          expect([[9, 3], [9, 4]]).toContainEqual(animal.step.to.tile);
          leaving.add(animal);
        }
      }
      expect(leaving.size).toBe(animals.length);
    }
    expect(animals.every((animal) => !animal.at.inside)).toBe(true);
    const cow = animals.find((animal) => animal.kind === "cow")!;
    expect(cow.at.tile).toEqual(cow.home);
    expect(cow.step).toBeNull();
  });

  it.each([false, true])("waits inside a moved barn for an open exit on the board, reduced motion %s", (reduced) => {
    const cow = at("cow", 4, 6);
    let animals = residents([cow, at("barn", 2, 2)], true, [], reduced);
    for (const layout of [[cow, at("barn", 10, 2)], [cow, at("barn", 7, 2), at("fence", 9, 2), at("fence", 9, 3)]]) {
      animals = residents(layout, true, animals, reduced);
      animals = residents(layout, false, animals, reduced);
      for (let i = 0; i < 80 && !reduced; i++) tick(animals, layout, false);
      expect(animals[0].at.inside).toBe(true);
      expect(animals[0].step).toBeNull();
    }
    const open = [cow, at("barn", 7, 2), at("fence", 9, 2)];
    animals = residents(open, false, animals, reduced);
    if (!reduced) {
      for (let i = 0; i < 30 && !animals[0].step; i++) tick(animals, open, false);
      expect(animals[0].step?.to.tile).toEqual([9, 3]);
      for (let i = 0; i < 400; i++) tick(animals, open, false);
    }
    expect(animals[0].at).toEqual({ tile: [4, 6], inside: false });
  });

  it("reroutes an animal still outside when the barn moves mid-entry", () => {
    const hen = at("chicken", 4, 2);
    const layout = [hen, at("barn", 2, 2)];
    let animals = residents(layout, false, []);
    tick(animals, layout, true);
    expect(animals[0].step?.to.inside).toBe(true);
    const moved = [hen, at("barn", 6, 3)];
    animals = residents(moved, true, animals);
    expect(animals[0].at).toEqual({ tile: [4, 2], inside: false });
    for (let i = 0; i < 400; i++) tick(animals, moved, true);
    expect(animals[0].at.inside).toBe(true);
    expect(animals[0].at.tile[0]).toBe(8);
  });

  it("keeps the cat's outings close and leaves time to rest between them", () => {
    const cat = startWalker("cat", [4, 4], false);
    const distance = () => Math.abs(cat.at.tile[0] - 4) + Math.abs(cat.at.tile[1] - 4);
    const blocked = new Set<string>();
    for (let i = 0; i < 300 && cat.wait <= 25; i++) {
      advance(cat, .1, false, blocked, () => .6);
      expect(distance()).toBeLessThanOrEqual(3);
    }
    expect(distance()).toBeGreaterThan(0);
    expect(cat.wait).toBeGreaterThanOrEqual(30);
  });

  it("keeps even a detour around a fence inside the roaming radius", () => {
    const home: Tile = [4, 4];
    const fence = new Set(Array.from({ length: 7 }, (_, y) => tileKey(5, y + 1)));
    for (let i = 0; i < 40; i++) {
      const path = planWalk(home, home, fence, false, () => i / 40, { radius: 3 });
      expect(path.length).toBeGreaterThan(0);
      expect(path.length).toBeLessThanOrEqual(3);
      expect(path.every(([x, y]) => Math.abs(x - 4) + Math.abs(y - 4) <= 3)).toBe(true);
    }
    expect(planWalk([6, 4], home, fence, true)).toContainEqual(home);
  });
});
