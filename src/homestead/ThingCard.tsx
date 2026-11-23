// The selected thing's card, outside the zoomed scene, so its words stay
// readable on a phone. A growing turnip shows its quality and stage, two
// strips and the buttons that give it experience; an empty bed has a button
// that plants each quality of seed held, or the way to the seeds when none
// is; a ripe turnip shows the day it ripened and «Собрать в урожай». So a bed
// is gathered, planted and grown from its own card. Any thing can be moved, a
// fence turned, and every item put back in stock. The close button or Escape
// returns to the scene.
import type { KeyboardEvent } from "react";
import { Button } from "@/ui/components/ui/button";
import { w } from "./strings";
import { Art } from "./IsoScene";
import { GROW_STEPS, growthOf, type Action, type Quality, type Thing, type Tile, type Turnip } from "./rules";
import { turnipTitle } from "./words";

export const CARD_TITLE_ID = "homestead-card-title";
/** The card's controls, in the order focus looks for them. */
export const GROW_ID = "homestead-grow";
export const GATHER_ID = "homestead-gather";
/** The button that plants the first quality of seed held. */
export const PLANT_ID = "homestead-plant";
/** An empty bed's way to the seed chooser, shown while no seed is held. */
export const CARD_SEEDS_ID = "homestead-card-seeds";
const DRY_ID = "homestead-card-dry";

type Props = {
  thing: Thing;
  /** The experience free to spend. */
  free: number;
  /** The qualities of seed held: an empty bed can be planted with any of them. */
  seeds: Quality[];
  /** What the last press gave this thing's turnip, shown until the next change. */
  given: number | null;
  onAct: (action: Action) => void;
  onMove: (thing: Thing) => void;
  /** Opens the seed chooser from an empty bed there is no seed for. */
  onSeeds: () => void;
  onClose: () => void;
};

function Strip({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="homestead-strip-row">
      <span className="homestead-strip" role="img" aria-label={label}>
        <span style={{ width: `${(100 * value) / Math.max(1, max)}%` }} />
      </span>
      <span className="homestead-strip-label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

function TurnipFacts({ turnip }: { turnip: Turnip }) {
  const { stage, ripe, since, span, total } = growthOf(turnip);
  if (ripe) {
    return (
      <div className="homestead-card-facts">
        <p>{w.card.ripe}</p>
        {turnip.ripened && <p>{w.card.ripenedOn(turnip.ripened)}</p>}
      </div>
    );
  }
  return (
    <div className="homestead-card-facts">
      <p>{w.card.stageOf(stage)}</p>
      <Strip value={since} max={span} label={w.card.toNext(since, span)} />
      <Strip value={turnip.given} max={total} label={w.card.total(turnip.given, total)} />
    </div>
  );
}

function Actions({ thing, free, seeds, onAct, onMove, onSeeds }: Pick<Props, "thing" | "free" | "seeds" | "onAct" | "onMove" | "onSeeds">) {
  const at: Tile = [thing.x, thing.y];
  const growth = thing.turnip && growthOf(thing.turnip);
  const dry = free <= 0;
  const emptyBed = thing.kind === "bed" && !thing.turnip;
  return (
    <div className="homestead-card-actions">
      {emptyBed &&
        seeds.map((type, i) => (
          <Button key={type} type="button" id={i === 0 ? PLANT_ID : `${PLANT_ID}-${type}`} variant={i === 0 ? "default" : "outline"} onClick={() => onAct({ action: "plant", at, seed: type })}>
            {w.card.plant(type)}
          </Button>
        ))}
      {emptyBed && seeds.length === 0 && (
        <Button type="button" id={CARD_SEEDS_ID} onClick={onSeeds}>
          {w.chooser.title}
        </Button>
      )}
      {growth &&
        !growth.ripe &&
        GROW_STEPS.map((amount, i) => (
          <Button
            key={amount}
            type="button"
            id={i === 0 ? GROW_ID : `${GROW_ID}-${amount}`}
            variant={i === 0 ? "default" : "outline"}
            disabled={dry}
            aria-describedby={dry ? DRY_ID : undefined}
            onClick={() => onAct({ action: "grow", at, amount })}
          >
            {w.card.grow(amount)}
          </Button>
        ))}
      {growth?.ripe && (
        <Button type="button" id={GATHER_ID} onClick={() => onAct({ action: "gather", at })}>
          {w.card.gather}
        </Button>
      )}
      <Button type="button" id="homestead-move" variant="outline" onClick={() => onMove(thing)}>
        {w.card.move}
      </Button>
      {thing.kind === "fence" && (
        <Button type="button" id="homestead-rotate" variant="outline" onClick={() => onAct({ action: "rotate", at })}>
          {w.card.rotate}
        </Button>
      )}
      <Button type="button" id="homestead-stock" variant="outline" onClick={() => onAct({ action: "stock", at })}>
        {w.card.stock}
      </Button>
    </div>
  );
}

export function ThingCard({ thing, free, seeds, given, onAct, onMove, onSeeds, onClose }: Props) {
  const turnip = thing.turnip;
  const growth = turnip && growthOf(turnip);
  const escape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose();
  };
  return (
    <section className="homestead-card" aria-labelledby={CARD_TITLE_ID} onKeyDown={escape}>
      <div className="homestead-card-head">
        <span className="homestead-card-art" aria-hidden="true">
          <Art thing={thing} />
        </span>
        <h2 id={CARD_TITLE_ID} tabIndex={-1}>
          {turnip ? turnipTitle(turnip) : w.kinds[thing.kind]}
        </h2>
        <Button type="button" variant="outline" size="sm" className="homestead-close" id="homestead-card-close" aria-label={w.card.close} onClick={onClose}>
          ×
        </Button>
      </div>
      {turnip && <TurnipFacts turnip={turnip} />}
      {thing.kind === "bed" && !turnip && <p>{seeds.length ? w.card.emptyBed : w.card.emptyBedNoSeed}</p>}
      {growth && !growth.ripe && free <= 0 && (
        <p className="homestead-note" id={DRY_ID}>
          {w.reasons.no_xp}
        </p>
      )}
      {growth && given !== null && <p className="homestead-card-given">{growth.ripe ? w.said.ripened(given) : w.said.grown(given, growth.stage)}</p>}
      <Actions thing={thing} free={free} seeds={seeds} onAct={onAct} onMove={onMove} onSeeds={onSeeds} />
    </section>
  );
}
