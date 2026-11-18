// The panels round the scene: the line of what is held (seeds, free
// experience, beds), the tray of tools, and the harvest shelf.
import type { ReactNode } from "react";
import { Plus, Sprout } from "lucide-react";
import { w } from "./strings";
import { Art } from "./IsoScene";
import { bedCount, harvestTotal, KINDS, OWNED, QUALITIES, STAGES, stockOf, type Homestead, type Quality } from "./rules";
import type { Mode } from "./screen";
import { Bed, Seed } from "./Turnip";

/** The tray button that opens the seed chooser; focus returns to it when the chooser closes. */
export const CHOOSER_CHIP_ID = "homestead-tray-chooser";

const heldSeeds = (home: Homestead) => QUALITIES.filter((type) => (home.seeds[type] ?? 0) > 0);

export function ResourceBar({ home, free }: { home: Homestead; free: number }) {
  const seeds = heldSeeds(home)
    .map((type) => w.resources.seed(type, home.seeds[type] ?? 0))
    .join(", ");
  return (
    <ul className="homestead-resources" aria-label={w.resources.label}>
      <li>
        <b>{w.resources.seeds}</b> {seeds || w.resources.noSeeds}
      </li>
      <li id="homestead-free">
        <b>{w.resources.xp}</b> {w.tray.xp(free)}
      </li>
      <li>
        <b>{w.resources.beds}</b> {w.resources.bedsOf(bedCount(home), OWNED.bed)}
      </li>
    </ul>
  );
}

type ChipProps = { id: string; pressed: boolean; art: ReactNode; label: string; count: string; onClick: () => void; onRefused?: () => void; disabled?: boolean };

/**
 * One tool of the tray. A tool there is none of is aria-disabled, not
 * disabled: it stays in the Tab order, so its «×0» is heard and the strip can
 * be scrolled by keyboard; a tap on it may say why it cannot be used.
 */
function Chip({ id, pressed, art, label, count, onClick, onRefused, disabled = false }: ChipProps) {
  return (
    <button type="button" id={id} className="homestead-chip" aria-pressed={pressed} aria-disabled={disabled || undefined} onClick={disabled ? onRefused : onClick}>
      <span className="homestead-chip-art" aria-hidden="true">
        {art}
      </span>
      <span>{label}</span> <span className="homestead-chip-count">{count}</span>
    </button>
  );
}

type TrayProps = { home: Homestead; free: number; mode: Mode | null; onMode: (mode: Mode | null) => void; chooser: boolean; onChooser: () => void };

/**
 * The tray, a strip that scrolls sideways: the free experience, which grows
 * turnips; each quality of seed held; the button that opens the seed chooser;
 * then every kind of thing with how many are in stock. A tap picks a tool up,
 * a second tap puts it down.
 */
export function Tray({ home, free, mode, onMode, chooser, onChooser }: TrayProps) {
  const toggle = (next: Mode, on: boolean) => onMode(on ? null : next);
  const growing = mode?.mode === "grow";
  return (
    <div className="homestead-tray" role="group" aria-label={w.tray.label}>
      <Chip
        id="homestead-tray-grow"
        pressed={growing}
        art={<Sprout className="homestead-chip-icon" />}
        label={w.tray.grow}
        count={w.tray.xp(free)}
        disabled={free <= 0}
        onClick={() => toggle({ mode: "grow" }, growing)}
        onRefused={() => onMode({ mode: "grow" })}
      />
      {heldSeeds(home).map((type) => {
        const on = mode?.mode === "seed" && mode.type === type;
        return <Chip key={type} id={`homestead-tray-seed-${type}`} pressed={on} art={<Seed type={type} />} label={w.tray.seed(type)} count={w.tray.count(home.seeds[type] ?? 0)} onClick={() => toggle({ mode: "seed", type }, on)} />;
      })}
      <button type="button" id={CHOOSER_CHIP_ID} className="homestead-chip" aria-expanded={chooser} onClick={onChooser}>
        <span className="homestead-chip-art" aria-hidden="true">
          <Plus className="homestead-chip-icon" />
        </span>
        <span>{w.chooser.title}</span>
      </button>
      <span className="homestead-tray-gap" aria-hidden="true" />
      {KINDS.map((kind) => {
        const on = mode?.mode === "place" && mode.kind === kind;
        const count = stockOf(home, kind);
        return <Chip key={kind} id={`homestead-tray-${kind}`} pressed={on} art={<Art thing={{ kind, rot: 0 }} />} label={w.kinds[kind]} count={w.tray.count(count)} disabled={count <= 0} onClick={() => toggle({ mode: "place", kind, rot: 0 }, on)} />;
      })}
    </div>
  );
}

const ripeTurnip = (type: Quality) => ({ type, stage: STAGES });

/** The gathered turnips: a row for each quality there is, with how many and the latest day one ripened. */
export function HarvestShelf({ home }: { home: Homestead }) {
  const rows = QUALITIES.flatMap((type) => {
    const gathered = home.harvest[type];
    return gathered ? [{ type, ...gathered }] : [];
  });
  return (
    <section className="homestead-harvest" aria-labelledby="homestead-harvest-title">
      <h2 id="homestead-harvest-title">{w.harvest.title}</h2>
      {rows.length === 0 ? (
        <p>{w.harvest.empty}</p>
      ) : (
        <>
          <p>{w.harvest.total(harvestTotal(home))}</p>
          <ul>
            {rows.map((row) => (
              <li key={row.type} data-quality={row.type}>
                <span className="homestead-harvest-art" aria-hidden="true">
                  <Bed turnip={ripeTurnip(row.type)} />
                </span>
                <span>{w.harvest.row(row.type, row.count)}</span>
                {row.latest && <small>{w.harvest.latest(row.latest)}</small>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
