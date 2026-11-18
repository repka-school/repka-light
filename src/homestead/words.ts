// The homestead's keys turned into words: every part of the screen and every
// announcement that names a thing, a stage, a tool or a result reads them here.
import { w } from "./strings";
import { growthOf, thingAt, type Homestead, type Thing, type Tile, type Turnip } from "./rules";
import type { Mode, Said } from "./screen";

const stageName = (stage: number) => w.stages[Math.min(w.stages.length, Math.max(1, stage)) - 1];

/** A turnip's quality and stage: «редкая репка, кустик». */
export const turnipTitle = (turnip: Turnip) => w.card.turnip(turnip.type, stageName(growthOf(turnip).stage));

function contentOf(thing: Thing | undefined) {
  if (!thing) return w.scene.free;
  if (thing.kind !== "bed") return w.kinds[thing.kind];
  if (!thing.turnip) return w.scene.emptyBed;
  const { stage, total } = growthOf(thing.turnip);
  return w.scene.turnip(thing.turnip.type, stageName(stage), thing.turnip.given, total);
}

/** A tile's name: where it is and what stands on it and, while a thing is being placed or moved, whether it may go there. */
export function cellName(home: Homestead, [x, y]: Tile, fits: boolean | null = null) {
  const name = w.scene.cell(w.scene.position(x, y), contentOf(thingAt(home, x, y)));
  return fits === null ? name : `${name}. ${w.modes.here(fits)}`;
}

/** The line that says which tool is in hand. */
export function modeLine(mode: Mode) {
  switch (mode.mode) {
    case "grow":
      return w.modes.grow;
    case "seed":
      return w.modes.seed(mode.type);
    case "place":
      return w.modes.place(mode.kind);
    case "move":
      return w.modes.move(mode.kind);
  }
}

/** What is said once after a result. */
export function saidWords(said: Said) {
  switch (said.key) {
    case "grown":
      return said.ripe ? w.said.ripened(said.given) : w.said.grown(said.given, said.stage);
    case "planted":
      return w.said.planted(said.seed);
    case "gathered":
      return w.said.gathered;
    case "stocked":
      return w.said.stocked(said.kind);
    case "placed":
      return w.said.placed[said.kind];
    case "rotated":
      return w.said.rotated;
    case "bought":
      return w.chooser.bought(said.seed, said.left);
    case "short":
      return w.chooser.short(said.lack);
    case "refused":
      return w.reasons[said.reason];
  }
}
