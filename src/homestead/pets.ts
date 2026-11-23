// The home tile belongs to the saved layout. A pet's footsteps only belong to
// the current visit. Both outbound walks and returns use the same free paths.
import { scenePt, tileCentre } from "./iso";
import { cells, GROUND, tileKey, type Thing, type Tile } from "./rules";

export type PetKind = "cat" | "dog";
export type WalkerKind = PetKind | "chicken" | "cow";
type Stop = { tile: Tile; inside: boolean };
type Step = { to: Stop; length: number; travelled: number };
type Visit = { tile: Tile; previous: Visit | null; steps: number };
export type Walker = {
  kind: WalkerKind; home: Tile; barn: Tile | null; at: Stop; route: Tile[]; step: Step | null;
  rain: boolean; wait: number; left: boolean;
};

const neighbours: Tile[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const key = ([x, y]: Tile) => tileKey(x, y);
const distance = (a: Tile, b: Tile) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);

const livestock = (kind: WalkerKind) => kind === "cow" || kind === "chicken";
const speed = { cat: 18, dog: 21, chicken: 28, cow: 22 };
const range = { cat: 3, dog: 6, chicken: 3, cow: 0 };
const atDoor = ([x, y]: Tile, barn: Tile) => x === barn[0] + 2 && (y === barn[1] || y === barn[1] + 1);

/** The preferred side of the doorway, or its other half if that side is occupied. */
function openExit(barn: Tile, row: number, blocked: Set<string>): Tile | undefined {
  const x = barn[0] + 2;
  if (x >= GROUND) return;
  for (const y of [row, row === barn[1] ? barn[1] + 1 : barn[1]]) {
    if (!blocked.has(tileKey(x, y))) return [x, y];
  }
}

export function startWalker(kind: WalkerKind, home: Tile, rain: boolean): Walker {
  const wait = kind === "cat" ? 3.2 : kind === "chicken" ? 2 + (home[0] * 3 + home[1]) % 5 : 5.6;
  return { kind, home, barn: null, at: { tile: home, inside: rain && !livestock(kind) }, route: [], step: null,
    rain, wait: rain ? 0 : wait, left: false };
}

export function blockedTiles(things: Thing[]) {
  // Livestock have no building on their saved tile. Their current positions
  // are reserved by the walkers as they move.
  return new Set(things.flatMap((t) => t.kind === "chicken" || t.kind === "cow" ? [] : cells(t.kind, t.x, t.y).map(key)));
}

/** Pick a reachable destination, then trace the shortest path back to the
 * start. If a new fence closes the way home, wait at the nearest reachable tile. */
export function planWalk(
  start: Tile, home: Tile, blocked: Set<string>, returning: boolean, random = Math.random,
  { radius = 6, barn = null, homeIsShelter = true }: { radius?: number; barn?: Tile | null; homeIsShelter?: boolean } = {},
): Tile[] {
  const queue: Visit[] = [{ tile: start, previous: null, steps: 0 }];
  const seen = new Set([key(start)]);
  // Keep an outing short on the actual path, even with fences in the way.
  // A return or a walk out of the barn can start far from the grazing ground.
  const nearby = !returning && distance(start, home) <= radius;
  for (const at of queue) {
    if (nearby && at.steps >= radius) continue;
    for (const [dx, dy] of neighbours) {
      const next: Tile = [at.tile[0] + dx, at.tile[1] + dy];
      const id = key(next);
      if (next.some((n) => n < 0 || n >= GROUND) || seen.has(id)) continue;
      const fromHome = distance(next, home);
      if (nearby && fromHome > radius) continue;
      if (blocked.has(id) && !(homeIsShelter && fromHome === 0)) continue;
      seen.add(id);
      queue.push({ tile: next, previous: at, steps: at.steps + 1 });
    }
  }
  let goal: Visit;
  if (barn) {
    // Either of the two cells facing the doors gives access to the threshold.
    const door = queue.find(({ tile }) => atDoor(tile, barn) && !blocked.has(key(tile)));
    if (!door) return [];
    goal = door;
  } else if (returning) {
    goal = queue.reduce((best, stop) => distance(stop.tile, home) < distance(best.tile, home) ? stop : best);
  } else {
    const local = queue.filter(({ tile, steps }) => distance(tile, home) <= radius && steps > 0);
    const excursions = local.filter(({ steps }) => steps >= 3 && steps <= radius);
    const choices = excursions.length ? excursions : local;
    if (!choices.length) return [];
    goal = choices[Math.floor(random() * choices.length)];
  }
  const path: Tile[] = [];
  for (let visit = goal; visit.previous; visit = visit.previous) path.push(visit.tile);
  return path.reverse();
}

/** Match residents to their saved tiles and update their doorway after edits.
 * On a rainy first visit and in reduced motion, use a reachable shelter. */
export function residents(things: Thing[], rain: boolean, previous: Walker[], reducedMotion = false): Walker[] {
  const building = things.find((thing) => thing.kind === "barn");
  const barn: Tile | null = building ? [building.x, building.y] : null;
  const blocked = blockedTiles(things);
  return things.flatMap(({ kind, x, y }) => {
    if (kind !== "cat" && kind !== "dog" && kind !== "cow" && kind !== "chicken") return [];
    const home: Tile = [x, y];
    const herd = livestock(kind);
    const existing = previous.find((p) => p.kind === kind && !distance(p.home, home));
    const indoors = herd && existing?.at.inside && existing.barn && barn;
    const pet = existing && (!reducedMotion || indoors) ? existing : startWalker(kind, home, rain);
    if (herd && (pet.barn?.[0] !== barn?.[0] || pet.barn?.[1] !== barn?.[1])) {
      if (pet.barn && barn && pet.at.inside) {
        // Indoor residents travel with the building, including anyone who has
        // started stepping out but has yet to set foot on the ground.
        const row = barn[1] + (pet.at.tile[1] - pet.barn[1]);
        pet.at = { tile: [Math.min(GROUND - 1, barn[0] + 2), row], inside: true };
      } else if (!barn && (pet.at.inside || pet.step?.to.inside)) {
        pet.at = { tile: home, inside: false };
      }
      pet.barn = barn;
      pet.step = null;
      pet.route = [];
      if (existing || rain) pet.wait = 0;
    }
    const obstructed = (tile: Tile) => blocked.has(key(tile)) && (herd || distance(tile, home) > 0);
    if (!pet.at.inside && obstructed(pet.at.tile)) {
      pet.at = { tile: home, inside: rain && !herd };
      pet.step = null;
      pet.route = [];
    } else if (pet.step && obstructed(pet.step.to.tile)) {
      pet.step = null;
      pet.route = [];
    }
    if (herd && barn && (reducedMotion || !previous.length)) {
      pet.step = null;
      pet.route = [];
      pet.rain = rain;
      if (rain && !pet.at.inside) {
        const route = planWalk(home, home, blocked, true, Math.random, { barn, homeIsShelter: false });
        const door = route.at(-1) ?? home;
        if (atDoor(door, barn)) pet.at = { tile: door, inside: true };
      } else if (!rain && pet.at.inside && openExit(barn, pet.at.tile[1], blocked)) {
        pet.at = { tile: home, inside: false };
      }
    }
    return pet;
  });
}

function point(pet: Walker, stop: Stop) {
  const centre = tileCentre(...stop.tile);
  if (livestock(pet.kind)) {
    if (!stop.inside || !pet.barn) return centre;
    const [x, y] = scenePt(pet.barn[0] + 1.9, pet.barn[1] + 1);
    return { x, y };
  }
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
    shelter, scale: 1 - shelter*.30, left: pet.left, walking: !!step || pet.route.length > 0,
  };
}

function stepTo(pet: Walker, to: Stop) {
  const a = point(pet, pet.at), b = point(pet, to);
  pet.left = b.x < a.x;
  pet.step = { to, length: Math.hypot(b.x-a.x, b.y-a.y), travelled: 0 };
}

function nextStop(pet: Walker, rain: boolean, blocked: Set<string>, random: () => number): Stop | null {
  const herd = livestock(pet.kind);
  if (pet.at.inside) {
    if (rain) return null;
    if (pet.barn) {
      const door = openExit(pet.barn, pet.at.tile[1], blocked);
      if (!door) return null;
      pet.at.tile = door;
    }
    return { tile: pet.at.tile, inside: false };
  }
  const home = distance(pet.at.tile, pet.home) === 0;
  if (rain) {
    if (herd && !pet.barn) return null;
    const atShelter = pet.barn ? atDoor(pet.at.tile, pet.barn) : home;
    if (atShelter) {
      pet.route = [];
      return { tile: pet.at.tile, inside: true };
    }
  } else if (pet.kind === "cow" && home) return null;
  if (!pet.route.length || blocked.has(key(pet.route[0]))) {
    pet.route = planWalk(pet.at.tile, pet.home, blocked, rain || pet.kind === "cow", random, {
      radius: range[pet.kind], barn: rain ? pet.barn : null, homeIsShelter: !herd,
    });
  }
  const tile = pet.route.shift();
  return tile ? { tile, inside: false } : null;
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
    const next = nextStop(pet, rain, blocked, random);
    if (!next) { pet.wait = 2; return false; }
    stepTo(pet, next);
  }
  const step = pet.step!;
  const travel = Math.min(step.length - step.travelled, seconds * speed[pet.kind]);
  step.travelled += travel;
  if (step.travelled >= step.length) {
    const leavingBarn = pet.barn && pet.at.inside;
    pet.at = step.to;
    pet.step = null;
    if (!pet.route.length) pet.wait = rain || leavingBarn || pet.kind === "cow" ? 0 : (pet.kind === "cat" ? 30 : 10) + random()*12;
    if (pet.at.inside) pet.left = false;
  }
  return true;
}

/** Reserve both ends of each step. The barn can hold the whole flock, even
 * when only one entrance is free. A cow grazing on the doorstep exits last. */
export function advanceWalkers(animals: Walker[], seconds: number, rain: boolean, occupied: Set<string>, random = Math.random) {
  let changed = false;
  for (const animal of animals) {
    if (!rain && animal.kind === "cow" && animal.at.inside && !animal.step && animal.barn && atDoor(animal.home, animal.barn)) {
      const hensLeaving = animals.some((other) => other.kind === "chicken" && (other.at.inside || other.step?.to.inside));
      if (hensLeaving) continue;
    }
    let blocked = occupied;
    if (!animal.step && !(rain && animal.at.inside) && (rain !== animal.rain || animal.wait <= 0)) {
      blocked = new Set(occupied);
      for (const other of animals) {
        if (other === animal || (other.at.inside && !other.step)) continue;
        blocked.add(key(other.at.tile));
        if (other.step) blocked.add(key(other.step.to.tile));
      }
    }
    if (advance(animal, seconds, rain, blocked, random)) changed = true;
  }
  return changed;
}
