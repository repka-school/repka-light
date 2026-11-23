// The panels round the scene: the tray of tools, which also says what is
// held (the free experience, the seeds, what is in stock), and the harvest shelf.
import { useEffect, useRef, type FocusEvent, type ReactNode } from "react";
import { Plus, Sprout } from "lucide-react";
import { w } from "./strings";
import { Art } from "./IsoScene";
import { harvestTotal, heldSeeds, KINDS, QUALITIES, STAGES, stockOf, type Homestead, type Quality } from "./rules";
import type { Mode } from "./screen";
import { Bed, Seed } from "./Turnip";

/** The tray button that opens the seed chooser; focus returns to it when the chooser closes. */
export const CHOOSER_CHIP_ID = "homestead-tray-chooser";

type ChipProps = { id: string; pressed: boolean; art: ReactNode; label: string; count: string; onClick: () => void; onRefused?: () => void; disabled?: boolean };

/**
 * One tool of the tray. A tool that cannot be used now is aria-disabled, not
 * disabled: it stays in the Tab order, so what it holds is heard, and a tap
 * on it may say why it cannot be used.
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

/** Marks a strip that scrolls sideways with the edges past which more of it lies: `data-more` is "left", "right" or both. */
function useMore() {
  const strip = useRef<HTMLDivElement>(null);
  // After every render: a tool that came or went changes how far the strip scrolls.
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const mark = () => {
      const left = el.scrollLeft > 4;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      const more = [left && "left", right && "right"].filter(Boolean).join(" ");
      if (more) el.dataset.more = more;
      else delete el.dataset.more;
    };
    mark();
    el.addEventListener("scroll", mark, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(mark);
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", mark);
      observer?.disconnect();
    };
  });
  return strip;
}

/** A tool the keyboard came to is brought whole into the strip; a tapped one stays under the finger. */
function intoView(event: FocusEvent<HTMLDivElement>) {
  if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
}

type TrayProps = { home: Homestead; free: number; mode: Mode | null; onMode: (mode: Mode | null) => void; chooser: boolean; onChooser: () => void };

/**
 * The tray: the free experience, which grows turnips; each quality of seed
 * held; the button that opens the seed chooser; then each kind of thing there
 * is some of in stock, with how many. A kind there is none of is not shown:
 * every one of it stands on the ground. A tap picks a tool up, a second tap
 * puts it down. On a narrow page the tray is a strip that scrolls sideways;
 * on a wide one it wraps.
 */
export function Tray({ home, free, mode, onMode, chooser, onChooser }: TrayProps) {
  const toggle = (next: Mode, on: boolean) => onMode(on ? null : next);
  const growing = mode?.mode === "grow";
  const strip = useMore();
  const stocked = KINDS.filter((kind) => stockOf(home, kind) > 0);
  return (
    <div ref={strip} className="homestead-tray" role="group" aria-label={w.tray.label} onFocus={intoView}>
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
      {stocked.length > 0 && <span className="homestead-tray-gap" aria-hidden="true" />}
      {stocked.map((kind) => {
        const on = mode?.mode === "place" && mode.kind === kind;
        return <Chip key={kind} id={`homestead-tray-${kind}`} pressed={on} art={<Art thing={{ kind, rot: 0, turnip: kind === "bed" ? home.storedCrops?.[0] : undefined }} />} label={w.kinds[kind]} count={w.tray.count(stockOf(home, kind))} onClick={() => toggle({ mode: "place", kind, rot: 0 }, on)} />;
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
