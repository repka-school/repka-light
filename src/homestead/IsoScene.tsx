// What the scene shows: the ground's tiles as the cells of one grid, each
// named by its place and what stands on it, tinted by its mark; the things'
// drawings over them, with a bed the tool can be used on, the selected thing
// and the keyboard cursor's thing ringed along their own outline; a strip
// over each growing turnip that fills toward its next stage; and, above
// everything, an outline round a footprint that does not fit and the keyboard
// cursor on an empty tile. The grid itself, its Tab stop and its keys belong
// to Scene.tsx.
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { SCENE, spriteBox, tileBox } from "./iso";
import { GROUND, growthOf, thingAt, tileKey, type Homestead, type Kind, type Thing, type Tile } from "./rules";
import type { Mark } from "./screen";
import { Sprite } from "./Sprites";
import { Bed } from "./Turnip";
import { cellName } from "./words";

/** A grid cell's id, which the grid names as its active descendant. */
export const tileId = ([x, y]: Tile) => `homestead-tile-${x}-${y}`;

/** A thing being placed or moved, drawn where it would stand. */
export type Ghost = { kind: Kind; x: number; y: number; rot: number; ok: boolean };

type Props = {
  home: Homestead;
  cursor: Tile;
  marks: Map<string, Mark>;
  ghost: Ghost | null;
  /** Whether the thing in hand fits at the cursor, said in the cursor cell's name. */
  fits: boolean | null;
  onTile: (tile: Tile) => void;
  /** A mouse moved over this tile, or over the thing on it. */
  onHover: (tile: Tile) => void;
};

/** Reports a mouse over a tile; touch and pen do not hover. */
const mouseOver = (onHover: (tile: Tile) => void, tile: Tile) => (event: PointerEvent) => {
  if (event.pointerType === "mouse") onHover(tile);
};

type Box = { left: number; top: number; width: number; height: number; zIndex?: number };
const boxStyle = ({ left, top, width, height, zIndex }: Box): CSSProperties => ({ left, top, width, height, zIndex });

/** A thing's drawing: a bed with its turnip, or the sprite of its kind. */
export function Art({ thing }: { thing: Pick<Thing, "kind" | "rot" | "turnip"> }) {
  if (thing.kind !== "bed") return <Sprite kind={thing.kind} rot={thing.rot} />;
  return <Bed turnip={thing.turnip && { type: thing.turnip.type, stage: growthOf(thing.turnip).stage }} />;
}

/** The hatching on a tile that fits and on one that does not, so the two are not told by colour alone. */
function Patterns() {
  return (
    <svg className="homestead-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        <pattern id="homestead-hatch-ok" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" className="homestead-hatch-ground-ok" />
          <line x1="0" y1="0" x2="0" y2="8" className="homestead-hatch-line-ok" />
        </pattern>
        <pattern id="homestead-hatch-bad" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" className="homestead-hatch-ground-bad" />
          <path d="M0 0 8 8M8 0 0 8" className="homestead-hatch-line-bad" />
        </pattern>
      </defs>
    </svg>
  );
}

const tileShape = "M48 1 95 24 48 47 1 24Z";
/** Above every drawing, so a mark on a bed or a house is seen. */
const MARK_Z = 9000;
/** The growth strips: above every drawing, so one in front never hides them, and under the marks. */
const STRIP_Z = MARK_Z - 1;

/** The square of tiles that carry a mark: its top tile and its side. */
function squareOf(marks: Map<string, Mark>, mark: Mark): { x: number; y: number; n: number } | null {
  const tiles = [...marks.entries()].filter(([, m]) => m === mark).map(([key]) => key.split(",").map(Number));
  if (!tiles.length) return null;
  const xs = tiles.map(([x]) => x);
  const ys = tiles.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, n: Math.max(Math.max(...xs) - x, Math.max(...ys) - y) + 1 };
}

type Taps = Pick<Props, "onTile" | "onHover">;

/**
 * The marks drawn over the things: one slim outline round a footprint that
 * does not fit, and the keyboard cursor on an empty tile. A tap on a mark is a
 * tap on its tile.
 */
function MarkLayer({ marks, cursor, cursorOnThing, onTile, onHover }: Taps & { marks: Map<string, Mark>; cursor: Tile; cursorOnThing: boolean }) {
  const blocked = squareOf(marks, "blocked");
  const box = blocked && tileBox(blocked.x, blocked.y);
  return (
    <>
      {blocked && box && (
        // An n×n diamond shares its top corner with its top tile.
        <span
          className="homestead-mark is-blocked"
          style={{ left: box.left + (box.width * (1 - blocked.n)) / 2, top: box.top, width: box.width * blocked.n, height: box.height * blocked.n, zIndex: MARK_Z + 500 }}
          onClick={() => onTile([blocked.x, blocked.y])}
          onPointerEnter={mouseOver(onHover, [blocked.x, blocked.y])}
          aria-hidden="true"
        >
          <svg viewBox="0 0 96 48" preserveAspectRatio="none" focusable="false">
            <path d={tileShape} vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
      )}
      {!cursorOnThing && (
        <span className="homestead-mark is-cursor" style={{ ...boxStyle(tileBox(cursor[0], cursor[1])), zIndex: MARK_Z + 1000 }} onClick={() => onTile(cursor)} onPointerEnter={mouseOver(onHover, cursor)} aria-hidden="true">
          <svg viewBox="0 0 96 48" focusable="false">
            <path d={tileShape} className="homestead-cursor-outer" />
            <path d={tileShape} className="homestead-cursor-inner" />
          </svg>
        </span>
      )}
    </>
  );
}

const thingKey = (thing: Thing) => `${thing.kind}-${thing.x}-${thing.y}`;

export function IsoScene({ home, cursor, marks, ghost, fits, onTile, onHover }: Props) {
  const rows: ReactNode[] = [];
  for (let y = 0; y < GROUND; y++) {
    const cells: ReactNode[] = [];
    for (let x = 0; x < GROUND; x++) {
      const mark = marks.get(tileKey(x, y));
      const here = x === cursor[0] && y === cursor[1];
      cells.push(
        <div
          role="gridcell"
          key={x}
          id={tileId([x, y])}
          aria-label={cellName(home, [x, y], here ? fits : null)}
          aria-selected={mark === "selected"}
          className={`homestead-tile${(x + y) % 2 ? " is-odd" : ""}${mark ? ` is-${mark}` : ""}`}
          style={boxStyle(tileBox(x, y))}
          onClick={() => onTile([x, y])}
          onPointerEnter={mouseOver(onHover, [x, y])}
        >
          <svg viewBox="0 0 96 48" aria-hidden="true" focusable="false">
            <path d={tileShape} />
            {mark && <path d={tileShape} className="homestead-tint-hatch" />}
          </svg>
        </div>,
      );
    }
    rows.push(
      <div role="row" key={y} className="homestead-row">
        {cells}
      </div>,
    );
  }
  const atCursor = thingAt(home, cursor[0], cursor[1]);
  const ringOf = (thing: Thing) => {
    const mark = marks.get(tileKey(thing.x, thing.y));
    return `${mark === "target" || mark === "selected" ? ` is-${mark}` : ""}${thing === atCursor ? " is-cursor" : ""}`;
  };
  return (
    <div className="homestead-iso" style={SCENE}>
      <Patterns />
      {rows}
      {home.things.map((thing) => (
        <span
          key={thingKey(thing)}
          className={`homestead-thing${ringOf(thing)}`}
          style={boxStyle(spriteBox(thing.kind, thing.x, thing.y))}
          onClick={() => onTile([thing.x, thing.y])}
          onPointerEnter={mouseOver(onHover, [thing.x, thing.y])}
          aria-hidden="true"
          data-thing={thing.kind}
        >
          <Art thing={thing} />
        </span>
      ))}
      {home.things.map((thing) => {
        const growth = thing.turnip && growthOf(thing.turnip);
        if (!growth || growth.ripe) return null;
        return (
          <span key={`strip-${thingKey(thing)}`} className="homestead-strip-slot" style={{ ...boxStyle(spriteBox(thing.kind, thing.x, thing.y)), zIndex: STRIP_Z }} aria-hidden="true">
            <span className="homestead-growbar">
              <span style={{ width: `${(100 * growth.since) / Math.max(1, growth.span)}%` }} />
            </span>
          </span>
        );
      })}
      <MarkLayer marks={marks} cursor={cursor} cursorOnThing={!!atCursor} onTile={onTile} onHover={onHover} />
      {ghost && (
        <span className={`homestead-thing homestead-ghost ${ghost.ok ? "is-ok" : "is-bad"}`} style={{ ...boxStyle(spriteBox(ghost.kind, ghost.x, ghost.y)), zIndex: 9999 }} aria-hidden="true">
          <Art thing={{ kind: ghost.kind, rot: ghost.rot ? 1 : 0 }} />
        </span>
      )}
    </div>
  );
}
