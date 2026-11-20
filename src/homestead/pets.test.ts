import { describe, expect, it } from "vitest";
import { advance, blockedTiles, planWalk, poseOf, startWalker } from "./pets";
import { starter, tileKey, type Tile } from "./rules";

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
});
