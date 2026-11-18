// The homestead's rules: a square ground with a fixed set of things to
// arrange, seeds of four qualities bought with experience, turnips that grow
// by the experience given to them, and the harvest. Experience spent here is
// counted apart from the experience earned, so a level never goes down.
// Pure: no storage, no DOM, no words.

export const QUALITIES = ["common", "rare", "epic", "legendary"] as const;
/** A seed's quality, and the quality of the turnip it grows into. */
export type Quality = (typeof QUALITIES)[number];

/** Every kind of thing, in the order the tray lists them. */
export const KINDS = ["bed", "fence", "bush", "tree", "barn", "house"] as const;
export type Kind = (typeof KINDS)[number];

/** What a seed costs and what its turnip takes to ripen, in experience. */
export const SEEDS: Record<Quality, { price: number; total: number }> = {
  common: { price: 25, total: 100 },
  rare: { price: 50, total: 200 },
  epic: { price: 100, total: 300 },
  legendary: { price: 200, total: 400 },
};

/** The ground's side, in tiles. */
export const GROUND = 10;
/** Growth stages: 1 with nothing given, STAGES when ripe. */
export const STAGES = 10;
/** How many things of each kind there are, on the ground and in stock together. */
export const OWNED: Record<Kind, number> = { bed: 4, fence: 10, bush: 3, tree: 2, barn: 1, house: 1 };
/** The experience one press gives a turnip: a small step and a big one. */
export const GROW_STEPS = [10, 50] as const;

export type Tile = [x: number, y: number];

/** A turnip in its bed. `ripened` is the day it became ripe, YYYY-MM-DD. */
export type Turnip = { type: Quality; given: number; ripened?: string };

/** A thing on the ground, at the top tile of its footprint. Only a fence is turned (`rot` 1); only a bed holds a turnip. */
export type Thing = { kind: Kind; x: number; y: number; rot: 0 | 1; turnip?: Turnip };

/** The gathered turnips of one quality: how many, and the latest day one of them ripened. */
export type Gathered = { count: number; latest: string };

export type Homestead = {
  /** Experience spent on seeds and on growing turnips. */
  spent: number;
  /** Seeds held and not yet planted. */
  seeds: Partial<Record<Quality, number>>;
  /** The things on the ground. Whatever is owned and not here is in stock. */
  things: Thing[];
  harvest: Partial<Record<Quality, Gathered>>;
};

const at = (kind: Kind, x: number, y: number): Thing => ({ kind, x, y, rot: 0 });

/** Where everything stands before the first change: a house and a barn, a fence along the top, trees, bushes and three beds. */
const starterThings = (): Thing[] => [
  at("house", 1, 1),
  at("barn", 6, 1),
  ...Array.from({ length: GROUND }, (_, x) => at("fence", x, 0)),
  at("tree", 9, 3),
  at("tree", 1, 8),
  at("bush", 3, 3),
  at("bush", 4, 3),
  at("bush", 8, 8),
  at("bed", 2, 5),
  at("bed", 3, 5),
  at("bed", 4, 5),
];

/** The homestead everyone starts with: the starter layout and one common seed, the only seed that is free. */
export const starter = (): Homestead => ({ spent: 0, seeds: { common: 1 }, things: starterThings(), harvest: {} });

/** The experience free to spend: what was earned less what was spent here. */
export const freeXp = (home: Homestead, earned: number) => Math.max(0, earned - home.spent);

/** The side of the square a kind covers: 2 for a house or a barn, 1 for anything else. */
export const footprint = (kind: Kind) => (kind === "house" || kind === "barn" ? 2 : 1);

/** The tiles a thing of a kind covers at (x, y). */
export function cells(kind: Kind, x: number, y: number): Tile[] {
  const n = footprint(kind);
  const out: Tile[] = [];
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) out.push([x + dx, y + dy]);
  return out;
}

export const tileKey = (x: number, y: number) => `${x},${y}`;

/** Which thing covers each tile, leaving one thing out. */
function occupancy(things: Thing[], ignore?: Thing): Map<string, Thing> {
  const taken = new Map<string, Thing>();
  for (const thing of things) if (thing !== ignore) for (const [x, y] of cells(thing.kind, thing.x, thing.y)) taken.set(tileKey(x, y), thing);
  return taken;
}

/** The thing covering tile (x, y), if any. */
export const thingAt = (home: Homestead, x: number, y: number) => occupancy(home.things).get(tileKey(x, y));

/** Why a refused change was refused. */
export type Reason =
  | "no_xp"
  | "not_enough_xp"
  | "no_seed"
  | "not_in_stock"
  | "outside_ground"
  | "tile_taken"
  | "bed_planted"
  | "bed_empty"
  | "turnip_ripe"
  | "not_ripe"
  | "not_rotatable"
  | "unknown_thing";

/** Why a thing of a kind cannot stand at (x, y), or null when it can. `ignore` is the thing being moved. */
export function placeRefusal(things: Thing[], kind: Kind, x: number, y: number, ignore?: Thing): Extract<Reason, "outside_ground" | "tile_taken"> | null {
  const n = footprint(kind);
  if (x < 0 || y < 0 || x + n > GROUND || y + n > GROUND) return "outside_ground";
  const taken = occupancy(things, ignore);
  return cells(kind, x, y).some(([cx, cy]) => taken.has(tileKey(cx, cy))) ? "tile_taken" : null;
}

/** A turnip's stage, 1 to STAGES: stage k + 1 once it has been given k / (STAGES − 1) of its total. */
export const stageOf = (total: number, given: number) => 1 + Math.min(STAGES - 1, Math.floor((given * (STAGES - 1)) / total));

/** The experience given at which a stage begins. */
const stageStart = (total: number, stage: number) => Math.ceil(((stage - 1) * total) / (STAGES - 1));

export type Growth = {
  total: number;
  stage: number;
  ripe: boolean;
  /** Experience still to give until it is ripe. */
  left: number;
  /** Experience given since the stage began, and the stage's whole span. */
  since: number;
  span: number;
};

/** Where a turnip stands: its stage, whether it is ripe, and how far it is through the stage. */
export function growthOf(turnip: Pick<Turnip, "type" | "given">): Growth {
  const { total } = SEEDS[turnip.type];
  const stage = stageOf(total, turnip.given);
  const ripe = turnip.given >= total;
  const since = turnip.given - stageStart(total, stage);
  const span = ripe ? since : stageStart(total, stage + 1) - stageStart(total, stage);
  return { total, stage, ripe, left: Math.max(0, total - turnip.given), since, span };
}

export const isRipe = (turnip: Pick<Turnip, "type" | "given">) => turnip.given >= SEEDS[turnip.type].total;

/** How many of a kind are in stock: those owned and not on the ground. */
export const stockOf = (home: Homestead, kind: Kind) => Math.max(0, OWNED[kind] - home.things.filter((thing) => thing.kind === kind).length);

export const bedCount = (home: Homestead) => home.things.filter((thing) => thing.kind === "bed").length;

/** All the seeds held, of every quality. */
export const seedTotal = (home: Homestead) => QUALITIES.reduce((sum, type) => sum + (home.seeds[type] ?? 0), 0);

/** All the gathered turnips. */
export const harvestTotal = (home: Homestead) => QUALITIES.reduce((sum, type) => sum + (home.harvest[type]?.count ?? 0), 0);

/** Whether every bed holds a turnip and none waits in stock: a seed bought now has to wait. */
export function bedsFull(home: Homestead) {
  const beds = home.things.filter((thing) => thing.kind === "bed");
  return beds.length > 0 && beds.every((bed) => bed.turnip) && stockOf(home, "bed") === 0;
}

/** One change to the homestead. A thing is named by a tile it covers. */
export type Action =
  | { action: "buy"; seed: Quality }
  | { action: "plant"; at: Tile; seed: Quality }
  | { action: "grow"; at: Tile; amount: number }
  | { action: "gather"; at: Tile }
  | { action: "place"; kind: Kind; x: number; y: number; rot?: 0 | 1 }
  | { action: "move"; from: Tile; x: number; y: number }
  | { action: "rotate"; at: Tile }
  | { action: "stock"; at: Tile };

/** A change's result: the homestead after it and the experience it gave a turnip, or why it was refused. */
export type Applied = { ok: true; home: Homestead; given: number } | { ok: false; reason: Reason };

const refuse = (reason: Reason): Applied => ({ ok: false, reason });
const done = (home: Homestead, given = 0): Applied => ({ ok: true, home, given });

/** The things with one of them replaced, or taken away. */
const swap = (home: Homestead, thing: Thing, next?: Thing): Thing[] => home.things.flatMap((t) => (t === thing ? (next ? [next] : []) : [t]));

/** The tile a change names: where its thing stands. */
export const targetOf = (action: Action): Tile | null => ("at" in action ? action.at : "from" in action ? action.from : null);

function buy(home: Homestead, seed: Quality, free: number): Applied {
  const { price } = SEEDS[seed];
  if (free < price) return refuse("not_enough_xp");
  return done({ ...home, spent: home.spent + price, seeds: { ...home.seeds, [seed]: (home.seeds[seed] ?? 0) + 1 } });
}

function plant(home: Homestead, bed: Thing, seed: Quality): Applied {
  if (bed.turnip) return refuse("bed_planted");
  const held = home.seeds[seed] ?? 0;
  if (held <= 0) return refuse("no_seed");
  const seeds = { ...home.seeds, [seed]: held - 1 };
  if (held === 1) delete seeds[seed];
  return done({ ...home, seeds, things: swap(home, bed, { ...bed, turnip: { type: seed, given: 0 } }) });
}

/** A turnip grows by what was asked, by the free experience or by what it still needs, whichever is least. */
function grow(home: Homestead, bed: Thing, amount: number, free: number, today: string): Applied {
  const turnip = bed.turnip;
  if (!turnip) return refuse("bed_empty");
  const { ripe, left } = growthOf(turnip);
  if (ripe) return refuse("turnip_ripe");
  const given = Math.min(Math.floor(amount), free, left);
  if (!(given > 0)) return refuse("no_xp");
  const grown: Turnip = { type: turnip.type, given: turnip.given + given };
  if (isRipe(grown)) grown.ripened = today;
  return done({ ...home, spent: home.spent + given, things: swap(home, bed, { ...bed, turnip: grown }) }, given);
}

function gather(home: Homestead, bed: Thing, today: string): Applied {
  const turnip = bed.turnip;
  if (!turnip) return refuse("bed_empty");
  if (!isRipe(turnip)) return refuse("not_ripe");
  const before = home.harvest[turnip.type];
  const day = turnip.ripened ?? today;
  const gathered: Gathered = { count: (before?.count ?? 0) + 1, latest: before && before.latest > day ? before.latest : day };
  const { turnip: _gone, ...empty } = bed;
  return done({ ...home, harvest: { ...home.harvest, [turnip.type]: gathered }, things: swap(home, bed, empty) });
}

function place(home: Homestead, kind: Kind, x: number, y: number, rot: 0 | 1): Applied {
  if (rot && kind !== "fence") return refuse("not_rotatable");
  if (stockOf(home, kind) <= 0) return refuse("not_in_stock");
  const refusal = placeRefusal(home.things, kind, x, y);
  return refusal ? refuse(refusal) : done({ ...home, things: [...home.things, { kind, x, y, rot }] });
}

function move(home: Homestead, thing: Thing, x: number, y: number): Applied {
  const refusal = placeRefusal(home.things, thing.kind, x, y, thing);
  return refusal ? refuse(refusal) : done({ ...home, things: swap(home, thing, { ...thing, x, y }) });
}

/**
 * One change applied to a homestead, or the rule that refuses it. `earned` is
 * all the experience earned so far; `today` dates a turnip that ripens.
 */
export function apply(home: Homestead, action: Action, earned: number, today: string): Applied {
  if (action.action === "buy") return buy(home, action.seed, freeXp(home, earned));
  if (action.action === "place") return place(home, action.kind, action.x, action.y, action.rot ?? 0);
  const tile = targetOf(action)!;
  const thing = thingAt(home, tile[0], tile[1]);
  if (!thing) return refuse("unknown_thing");
  switch (action.action) {
    case "move":
      return move(home, thing, action.x, action.y);
    case "rotate":
      return thing.kind === "fence" ? done({ ...home, things: swap(home, thing, { ...thing, rot: thing.rot ? 0 : 1 }) }) : refuse("not_rotatable");
    case "stock":
      return thing.turnip ? refuse("bed_planted") : done({ ...home, things: swap(home, thing) });
  }
  if (thing.kind !== "bed") return refuse("unknown_thing");
  switch (action.action) {
    case "plant":
      return plant(home, thing, action.seed);
    case "grow":
      return grow(home, thing, action.amount, freeXp(home, earned), today);
    case "gather":
      return gather(home, thing, today);
  }
}

/** A date's calendar day where the learner is, YYYY-MM-DD. */
export function dayOf(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}
