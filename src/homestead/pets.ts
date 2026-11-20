// The home tile belongs to the saved layout. A pet's footsteps only belong to
// the current visit. Both outbound walks and returns use the same free paths.
import { tileCentre } from "./iso";
import { cells, GROUND, tileKey, type Thing, type Tile } from "./rules";

export type PetKind = "cat" | "dog";
type Stop = { tile: Tile; inside: boolean };
type Step = { to: Stop; length: number; travelled: number };
export type Walker = {
  kind: PetKind; home: Tile; at: Stop; route: Tile[]; step: Step | null;
  rain: boolean; wait: number; left: boolean;
};

const neighbours: Tile[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const key = ([x, y]: Tile) => tileKey(x, y);
const distance = (a: Tile, b: Tile) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);

export function startWalker(kind: PetKind, home: Tile, rain: boolean): Walker {
  return { kind, home, at: { tile: home, inside: rain }, route: [], step: null,
    rain, wait: kind === "cat" ? 3.2 : 5.6, left: false };
}

export function blockedTiles(things: Thing[]) {
  return new Set(things.flatMap((t) => cells(t.kind, t.x, t.y).map(key)));
}

/** Pick a reachable destination, then trace the shortest path back to the
 * start. If a new fence closes the way home, wait at the nearest reachable tile. */
export function planWalk(start: Tile, home: Tile, blocked: Set<string>, returning: boolean, random = Math.random): Tile[] {
  const queue: Tile[] = [start];
  const parent = new Map<string, Tile | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    for (const [dx, dy] of neighbours) {
      const next: Tile = [at[0] + dx, at[1] + dy];
      if (next.some((n) => n < 0 || n >= GROUND) || parent.has(key(next))) continue;
      if (blocked.has(key(next)) && distance(next, home) !== 0) continue;
      parent.set(key(next), at);
      queue.push(next);
    }
  }
  let goal: Tile;
  if (returning) {
    goal = queue.reduce((best, t) => distance(t, home) < distance(best, home) ? t : best, start);
  } else {
    const local = queue.filter((t) => distance(t, home) <= 6 && distance(t, start) > 0);
    const excursions = local.filter((t) => distance(t, start) >= 3 && distance(t, start) <= 6);
    const choices = excursions.length ? excursions : local;
    if (!choices.length) return [];
    goal = choices[Math.floor(random() * choices.length)];
  }
  const path: Tile[] = [];
  for (let t: Tile | null = goal; t && parent.get(key(t)); t = parent.get(key(t))!) path.push(t);
  return path.reverse();
}

function point(pet: Walker, stop: Stop) {
  const centre = tileCentre(...stop.tile);
  if (distance(stop.tile, pet.home)) return centre;
  if (!stop.inside) return { x: centre.x + 14, y: centre.y + 7 };
  return { x: centre.x - (pet.kind === "cat" ? 18 : 16), y: centre.y - (pet.kind === "cat" ? 11 : 4) };
}

export function poseOf(pet: Walker) {
  const from = point(pet, pet.at);
  const step = pet.step;
  const progress = step ? step.travelled / step.length : 0;
  const to = step ? point(pet, step.to) : from;
  const shelter = Number(pet.at.inside) * (1-progress) + Number(step?.to.inside ?? pet.at.inside) * progress;
  const startDepth = pet.at.tile[0] + pet.at.tile[1];
  const endDepth = step ? step.to.tile[0] + step.to.tile[1] : startDepth;
  return {
    x: from.x + (to.x-from.x)*progress, y: from.y + (to.y-from.y)*progress,
    zIndex: Math.round((2 + startDepth + (endDepth-startDepth)*progress)*10) + 1,
    scale: 1 - shelter*.30, left: pet.left, walking: !!step || pet.route.length > 0,
  };
}

function stepTo(pet: Walker, to: Stop) {
  const a = point(pet, pet.at), b = point(pet, to);
  pet.left = b.x < a.x;
  pet.step = { to, length: Math.hypot(b.x-a.x, b.y-a.y), travelled: 0 };
}

/** Advance by active seconds. A changed sky redirects a walk at its next
 * footfall on a tile. A resting animal starts for shelter immediately. */
export function advance(pet: Walker, seconds: number, rain: boolean, blocked: Set<string>, random = Math.random) {
  if (rain !== pet.rain) {
    pet.rain = rain;
    pet.route = [];
    pet.wait = 0;
  }
  if (!pet.step) {
    if (rain && pet.at.inside) return false;
    if (pet.wait > 0) {
      pet.wait -= seconds;
      return false;
    }
    if (distance(pet.at.tile, pet.home) === 0 && rain !== pet.at.inside) {
      pet.route = [];
      stepTo(pet, { tile: pet.home, inside: rain });
    } else {
      if (!pet.route.length || blocked.has(key(pet.route[0]))) {
        pet.route = planWalk(pet.at.tile, pet.home, blocked, rain, random);
      }
      const next = pet.route.shift();
      if (!next) { pet.wait = 2; return false; }
      stepTo(pet, { tile: next, inside: false });
    }
  }
  const step = pet.step!;
  const travel = Math.min(step.length - step.travelled, seconds * (pet.kind === "cat" ? 18 : 21));
  step.travelled += travel;
  if (step.travelled >= step.length) {
    pet.at = step.to;
    pet.step = null;
    if (!pet.route.length) pet.wait = rain ? 0 : 10 + random()*12;
    if (pet.at.inside) pet.left = false;
  }
  return true;
}
