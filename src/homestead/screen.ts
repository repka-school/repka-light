// What the homestead screen does with a tile, a tool and a change's result:
// which change a tile asks for, which tiles are marked, and what is said and
// where focus goes afterwards. Decided here as keys; words.ts turns them into
// text. Pure: no DOM.
import { cells, growthOf, GROUND, GROW_STEPS, placeRefusal, SEEDS, stockOf, thingAt, tileKey, type Action, type Homestead, type Kind, type Quality, type Reason, type Thing, type Tile } from "./rules";

/** The tool in hand: experience to grow turnips with, a seed to plant, a thing from stock to place, or a thing to move. */
export type Mode = { mode: "grow" } | { mode: "seed"; type: Quality } | { mode: "place"; kind: Kind; rot: 0 | 1 } | { mode: "move"; from: Tile; kind: Kind };

/** What a tile asks for under a tool: a change, selecting what stands there, a refusal, or nothing. */
export type Intent = { kind: "act"; action: Action } | { kind: "select" } | { kind: "refuse"; reason: Reason } | { kind: "none" };

const growing = (thing: Thing | undefined) => thing?.kind === "bed" && !!thing.turnip && !growthOf(thing.turnip).ripe;
const emptyBed = (thing: Thing | undefined) => thing?.kind === "bed" && !thing.turnip;
const movedThing = (home: Homestead, mode: Mode) => (mode.mode === "move" ? thingAt(home, mode.from[0], mode.from[1]) : undefined);

/** What Enter, Space or a tap on a tile does with the tool in hand. */
export function intentAt(home: Homestead, mode: Mode | null, [x, y]: Tile): Intent {
  const here = thingAt(home, x, y);
  if (mode?.mode === "grow" && growing(here)) return { kind: "act", action: { action: "grow", at: [here!.x, here!.y], amount: GROW_STEPS[0] } };
  if (mode?.mode === "seed" && emptyBed(here)) return { kind: "act", action: { action: "plant", at: [here!.x, here!.y], seed: mode.type } };
  if (mode?.mode === "place") {
    const refusal = placeRefusal(home.things, mode.kind, x, y);
    return refusal ? { kind: "refuse", reason: refusal } : { kind: "act", action: { action: "place", kind: mode.kind, x, y, rot: mode.rot } };
  }
  if (mode?.mode === "move") {
    const refusal = placeRefusal(home.things, mode.kind, x, y, movedThing(home, mode));
    return refusal ? { kind: "refuse", reason: refusal } : { kind: "act", action: { action: "move", from: mode.from, x, y } };
  }
  return here ? { kind: "select" } : { kind: "none" };
}

/** Whether a tool can still be used: experience left to give, a seed of its quality, the kind in stock, the thing still there. */
export function modeLasts(home: Homestead, mode: Mode, free: number): boolean {
  switch (mode.mode) {
    case "grow":
      return free > 0;
    case "seed":
      return (home.seeds[mode.type] ?? 0) > 0;
    case "place":
      return stockOf(home, mode.kind) > 0;
    case "move":
      return !!movedThing(home, mode);
  }
}

/**
 * How a tile is marked: a bed the tool can be used on (`target`), a
 * placement's footprint that fits (`fits`) or does not (`blocked`), or the
 * selected thing's tiles (`selected`).
 */
export type Mark = "target" | "fits" | "blocked" | "selected";

/** The scene's marks: the tool's beds or its footprint at the cursor, else the selected thing. */
export function marksOf(home: Homestead, mode: Mode | null, cursor: Tile, selected: Tile | null): Map<string, Mark> {
  const marks = new Map<string, Mark>();
  if (mode?.mode === "grow" || mode?.mode === "seed") {
    for (const thing of home.things) if (mode.mode === "grow" ? growing(thing) : emptyBed(thing)) marks.set(tileKey(thing.x, thing.y), "target");
  } else if (mode) {
    const ok = placeRefusal(home.things, mode.kind, cursor[0], cursor[1], movedThing(home, mode)) === null;
    for (const [x, y] of cells(mode.kind, cursor[0], cursor[1])) marks.set(tileKey(x, y), ok ? "fits" : "blocked");
  } else if (selected) {
    const thing = thingAt(home, selected[0], selected[1]);
    if (thing) for (const [x, y] of cells(thing.kind, thing.x, thing.y)) marks.set(tileKey(x, y), "selected");
  }
  return marks;
}

/** Whether the thing being placed or moved fits at the cursor; null with any other tool. */
export function fitsHere(home: Homestead, mode: Mode | null, cursor: Tile): boolean | null {
  if (mode?.mode !== "place" && mode?.mode !== "move") return null;
  return placeRefusal(home.things, mode.kind, cursor[0], cursor[1], movedThing(home, mode)) === null;
}

/** The tile the cursor starts on: the first bed, else the ground's corner. */
export function firstTile(home: Homestead): Tile {
  const bed = home.things.find((thing) => thing.kind === "bed");
  return bed ? [bed.x, bed.y] : [0, 0];
}

/** Where the cursor goes when a tool is picked up: the first bed it can be used on, else where it was. */
export function startTile(home: Homestead, mode: Mode, cursor: Tile): Tile {
  const bed = home.things.find((thing) => (mode.mode === "grow" ? growing(thing) : mode.mode === "seed" && emptyBed(thing)));
  return bed ? [bed.x, bed.y] : cursor;
}

const steps: Record<string, Tile> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
const onGround = (n: number) => Math.min(GROUND - 1, Math.max(0, n));

/** The cursor after an arrow key, kept on the ground; null for any other key. */
export function moveCursor([x, y]: Tile, key: string): Tile | null {
  const step = steps[key];
  return step ? [onGround(x + step[0]), onGround(y + step[1])] : null;
}

/** A change's result as the screen hears it. `thing` is what the change named, as it stood; `free` is the experience left to spend. */
export type Outcome =
  | { ok: true; action: Action; home: Homestead; given: number; free: number; thing?: Thing }
  | { ok: false; action: Action; reason: Reason; free: number; thing?: Thing };

/** What is said once after a result. */
export type Said =
  | { key: "grown"; given: number; stage: number; ripe: boolean }
  | { key: "planted"; seed: Quality }
  | { key: "gathered" }
  | { key: "stocked"; kind: Kind }
  | { key: "placed"; kind: Kind }
  | { key: "rotated" }
  | { key: "bought"; seed: Quality; left: number }
  | { key: "short"; lack: number }
  | { key: "refused"; reason: Reason };

/** Where focus goes: it stays on the control that acted, or moves to the scene, onto a tile. */
export type Focus = { to: "stay" } | { to: "scene"; tile?: Tile };

/** What follows a result: what is said, where focus goes, and whether the thing's card closes. */
export type After = { said: Said; focus: Focus; close: boolean };

const scene = (tile?: Tile): Focus => ({ to: "scene", tile });
const tileOf = (thing?: Thing): Tile | undefined => thing && [thing.x, thing.y];

function afterDone(outcome: Extract<Outcome, { ok: true }>): After {
  const { action, home, thing } = outcome;
  switch (action.action) {
    case "grow": {
      const turnip = thingAt(home, action.at[0], action.at[1])?.turnip;
      const growth = turnip ? growthOf(turnip) : null;
      // The grow buttons leave when the turnip ripens and switch off when the experience runs out: focus then goes to the scene.
      const gone = !!growth?.ripe || outcome.free <= 0;
      return { said: { key: "grown", given: outcome.given, stage: growth?.stage ?? 1, ripe: !!growth?.ripe }, focus: gone ? scene(tileOf(thing)) : { to: "stay" }, close: false };
    }
    case "plant":
      return { said: { key: "planted", seed: action.seed }, focus: scene(tileOf(thing)), close: false };
    case "gather":
      return { said: { key: "gathered" }, focus: scene(tileOf(thing)), close: false };
    case "stock":
      return { said: { key: "stocked", kind: thing?.kind ?? "bed" }, focus: scene(tileOf(thing)), close: true };
    case "place":
      return { said: { key: "placed", kind: action.kind }, focus: scene([action.x, action.y]), close: false };
    case "move":
      return { said: { key: "placed", kind: thing?.kind ?? "bed" }, focus: scene([action.x, action.y]), close: false };
    case "rotate":
      return { said: { key: "rotated" }, focus: { to: "stay" }, close: false };
    case "buy":
      return { said: { key: "bought", seed: action.seed, left: outcome.free }, focus: { to: "stay" }, close: false };
  }
}

/** What follows a change's result. */
export function afterOutcome(outcome: Outcome): After {
  if (outcome.ok) return afterDone(outcome);
  const { action, reason } = outcome;
  // A seed that costs too much says how much is missing.
  if (action.action === "buy" && reason === "not_enough_xp") return { said: { key: "short", lack: SEEDS[action.seed].price - outcome.free }, focus: { to: "stay" }, close: false };
  const placing = action.action === "place" || action.action === "move";
  return { said: { key: "refused", reason }, focus: placing ? scene() : { to: "stay" }, close: false };
}
