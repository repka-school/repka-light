// The cat and the dog that wander the free tiles, a step at a time. They only
// decorate: nothing is saved and nothing depends on where they are. Pure: the
// caller passes the dice.
import { GROUND, type Tile } from "./rules";

export type PetKind = "cat" | "dog";
/** A pet on its tile: the tile it came from (its own while it stays), whether it looks to the left, and how many more steps it rests. */
export type Pet = { kind: PetKind; at: Tile; from: Tile; left: boolean; rest: number };

const STEPS: Tile[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
/** How often a pet that could walk on sits down instead, and how often it keeps straight on. */
const REST_CHANCE = 0.2;
const STRAIGHT_CHANCE = 0.6;

const onGround = ([x, y]: Tile) => x >= 0 && y >= 0 && x < GROUND && y < GROUND;
const same = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];

/** The free tile nearest to a tile, itself included; null when the whole ground is taken. */
export function nearestFree(tile: Tile, free: (tile: Tile) => boolean): Tile | null {
  let best: Tile | null = null;
  let least = Infinity;
  for (let y = 0; y < GROUND; y++) {
    for (let x = 0; x < GROUND; x++) {
      const far = Math.abs(x - tile[0]) + Math.abs(y - tile[1]);
      if (far < least && free([x, y])) {
        best = [x, y];
        least = far;
      }
    }
  }
  return best;
}

/** A pet walking to a tile: on the screen +x and −y lead to the right, −x and +y to the left. */
function walk(pet: Pet, to: Tile): Pet {
  const across = to[0] - pet.at[0] - (to[1] - pet.at[1]);
  return { ...pet, from: pet.at, at: to, left: across ? across < 0 : pet.left, rest: 0 };
}

/**
 * A pet after one step: it rests, or walks to a free tile beside it, mostly
 * straight on and back only from a dead end. A pet whose tile was taken walks
 * off it. `roll` gives numbers from 0 up to 1.
 */
export function stepPet(pet: Pet, free: (tile: Tile) => boolean, roll: () => number): Pet {
  const stay: Pet = { ...pet, from: pet.at };
  if (!free(pet.at)) {
    const to = nearestFree(pet.at, free);
    return to ? walk(pet, to) : stay;
  }
  if (pet.rest > 0) return { ...stay, rest: pet.rest - 1 };
  if (roll() < REST_CHANCE) return { ...stay, rest: 2 + Math.floor(roll() * 4) };
  const beside = STEPS.map(([dx, dy]): Tile => [pet.at[0] + dx, pet.at[1] + dy]).filter((tile) => onGround(tile) && free(tile));
  if (!beside.length) return stay;
  const ahead: Tile = [2 * pet.at[0] - pet.from[0], 2 * pet.at[1] - pet.from[1]];
  if (!same(pet.at, pet.from) && beside.some((tile) => same(tile, ahead)) && roll() < STRAIGHT_CHANCE) return walk(pet, ahead);
  const onward = beside.filter((tile) => !same(tile, pet.from));
  const choice = onward.length ? onward : beside;
  return walk(pet, choice[Math.min(choice.length - 1, Math.floor(roll() * choice.length))]);
}

/** The pets where they start: each on the free tile nearest to its corner of the ground, never two on one tile. */
export function startPets(free: (tile: Tile) => boolean): Pet[] {
  const pets: Pet[] = [];
  const homes: [PetKind, Tile][] = [["cat", [4, 7]], ["dog", [7, 5]]];
  for (const [kind, home] of homes) {
    const at = nearestFree(home, (tile) => free(tile) && !pets.some((pet) => same(pet.at, tile)));
    if (at) pets.push({ kind, at, from: at, left: kind === "cat", rest: 1 });
  }
  return pets;
}
