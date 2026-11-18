// What the scene shows: a slab of earth with the ground on it; the ground's
// tiles as the cells of one grid, each named by its place and what stands on
// it, tinted by its mark, with a tuft, a flower or a pebble on some free ones;
// one sheet of light and of the things' shadows; the things' drawings, with a
// bed the tool can be used on, the selected thing and the keyboard cursor's
// thing ringed along their own outline; the animals (Critters.tsx) among
// them; a strip over each growing turnip that
// fills toward its next stage, and an arrow over a ripe one; and, above
// everything, an outline round a footprint that does not fit and the keyboard
// cursor on an empty tile. The grid itself, its Tab stop and its keys belong
// to Scene.tsx.
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { scatter, SCENE, scenePt, spriteBox, tileBox } from "./iso";
import { Critters } from "./Critters";
import { cells, GROUND, growthOf, thingAt, tileKey, type Homestead, type Kind, type Thing, type Tile } from "./rules";
import type { Mark } from "./screen";
import { Shadow, Sprite } from "./Sprites";
import { Bed } from "./Turnip";
import { cellName } from "./words";

/** A grid cell's id, which the grid names as its active descendant. */
export const tileId = ([x, y]: Tile) => `homestead-tile-${x}-${y}`;

/** A thing being placed or moved, drawn where it would stand; `from` is where a moved thing still stands. */
export type Ghost = { kind: Kind; x: number; y: number; rot: number; ok: boolean; from?: Tile };
/** Experience just given to the turnip on a tile; `n` tells one press from the next. */
export type Burst = { at: Tile; amount: number; n: number };

type Props = {
  home: Homestead;
  cursor: Tile;
  marks: Map<string, Mark>;
  ghost: Ghost | null;
  /** Whether the thing in hand fits at the cursor, said in the cursor cell's name. */
  fits: boolean | null;
  burst: Burst | null;
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

const G = GROUND;
const join = (points: [number, number][]) => points.map(([x, y]) => `${+x.toFixed(1)} ${+y.toFixed(1)}`).join(" ");
const sceneBox = `0 0 ${SCENE.width} ${SCENE.height}`;
/** The ground's outline: its far, right, near and left corners. */
const groundShape = join([scenePt(0, 0), scenePt(G, 0), scenePt(G, G), scenePt(0, G)]);

/** A point on the slab's near rim, `depth` under the grass: k runs from the left corner (0) by the near corner (G) to the right corner (2G). */
const rim = (k: number, depth = 0) => (k <= G ? scenePt(k, G, -depth) : scenePt(G, 2 * G - k, -depth));
/** How deep the slab is under its rim: thin at the side corners, thick at the near one, and uneven. */
const depthAt = (k: number) => 24 + 32 * Math.sin((Math.PI * k) / (2 * G)) ** 0.7 + 8 * scatter(Math.round(k * 4), 91);

/** A strip of the slab's side between two depths, from rim point `from` to `to`. */
function strip(from: number, to: number, step: number, top: (k: number) => number, bottom: (k: number) => number) {
  const ks: number[] = [];
  for (let k = from; k <= to + 1e-9; k += step) ks.push(k);
  return join([...ks.map((k) => rim(k, top(k))), ...ks.reverse().map((k) => rim(k, bottom(k)))]);
}

/** One side of the slab: earth, a darker layer under the turf, the turf's ragged edge, a seam and a few stones. */
function Side({ from, shade }: { from: number; shade: boolean }) {
  const to = from + G;
  const tone = shade ? " is-shade" : "";
  const stones = Array.from({ length: 5 }, (_, i) => {
    const k = from + 0.6 + i * 1.9 + 1.1 * scatter(i, from + 1);
    const room = depthAt(k) - 28;
    if (room <= 0) return null;
    const [cx, cy] = rim(k, 19 + room * scatter(i, from + 5));
    const r = 2.4 + 5 * scatter(i, from + 9);
    return (
      <g key={i}>
        <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.66} className={`l-stone${tone}`} />
        <path d={`M${cx - r * 0.6} ${cy - r * 0.2}q${r * 0.5} ${-r * 0.5} ${r * 1.1} ${-r * 0.1}`} className="l-stone-lit" />
      </g>
    );
  });
  const seam: [number, number][] = [];
  for (let k = from + 0.5; k <= to - 0.5; k += 0.5) seam.push(rim(k, depthAt(k) * 0.6 + 3 * scatter(Math.round(k * 2), 5)));
  return (
    <>
      <polygon points={strip(from, to, 1, () => 0, depthAt)} className={`l-soil${tone}`} />
      <polygon points={strip(from, to, 1, () => 3, (k) => 12 + 4 * scatter(Math.round(k), 7))} className={`l-loam${tone}`} />
      <polyline points={join(seam)} className="l-seam" />
      {stones}
      <polygon points={strip(from, to, 0.25, () => 0, (k) => 3.5 + 4.5 * scatter(Math.round(k * 4), 3))} className={`l-turf${tone}`} />
    </>
  );
}

/** The slab of earth the ground lies on, with a soft shadow under it. */
function Land() {
  const [cx, cy] = scenePt(G / 2, G / 2, -74);
  return (
    <svg className="homestead-land" viewBox={sceneBox} aria-hidden="true" focusable="false">
      <ellipse cx={cx} cy={cy} rx={G * 46} ry={G * 22} className="l-under" />
      <Side from={0} shade={false} />
      <Side from={G} shade />
      <polygon points={groundShape} className="l-top" />
    </svg>
  );
}

/** What grows on a free tile, in the tile's own space: nothing on most, else a tuft, flowers, pebbles or clover. */
function Decor({ x, y }: { x: number; y: number }) {
  const pick = scatter(x, y);
  if (pick < 0.38) return null;
  const cx = 48 + (scatter(x + 17, y) - 0.5) * 34;
  const cy = 26 + (scatter(x, y + 23) - 0.5) * 12;
  const tuft = (tx: number, ty: number) => `M${tx - 4} ${ty}q-1 -5 -4 -8M${tx - 1.5} ${ty}q0 -6 -1 -10.5M${tx + 1.5} ${ty}q1 -5 3.4 -8.6M${tx + 4} ${ty}q2 -3 5 -5`;
  if (pick < 0.68) {
    return (
      <g className="homestead-decor">
        <path d={tuft(cx, cy)} className="d-blade" />
        <path d={`M${cx} ${cy}q0.6 -5 0.4 -8.4`} className="d-blade-lit" />
      </g>
    );
  }
  if (pick < 0.84) {
    const tone = pick < 0.74 ? "d-petal" : pick < 0.79 ? "d-petal is-yellow" : "d-petal is-pink";
    const at: [number, number][] = [[cx - 7, cy - 1], [cx + 3, cy - 5], [cx + 8, cy + 3]];
    return (
      <g className="homestead-decor">
        <path d={at.map(([fx, fy]) => `M${fx} ${fy + 5}V${fy}`).join("")} className="d-blade" />
        {at.map(([fx, fy]) => (
          <g key={fx}>
            <circle cx={fx} cy={fy} r="2.7" className={tone} />
            <circle cx={fx} cy={fy} r="1" className="d-eye" />
          </g>
        ))}
      </g>
    );
  }
  if (pick < 0.93) {
    return (
      <g className="homestead-decor">
        <ellipse cx={cx} cy={cy} rx="5" ry="3.1" className="d-stone" />
        <path d={`M${cx - 3} ${cy - 0.8}q2.4 -2.2 5.4 -0.6`} className="d-stone-lit" />
        <ellipse cx={cx + 7.5} cy={cy + 2.4} rx="2.8" ry="1.8" className="d-stone" />
      </g>
    );
  }
  return (
    <g className="homestead-decor">
      <ellipse cx={cx} cy={cy} rx="15" ry="6.5" className="d-patch" />
      <path d={`${tuft(cx - 7, cy + 1)}${tuft(cx + 8, cy - 1)}`} className="d-blade" />
    </g>
  );
}

/** One sheet over the tiles and under the things: the light across the ground, and every thing's shadow as one shade. */
function Sheet({ things }: { things: Thing[] }) {
  return (
    <svg className="homestead-sheet" viewBox={sceneBox} aria-hidden="true" focusable="false">
      <clipPath id="homestead-ground-clip">
        <polygon points={groundShape} />
      </clipPath>
      <polygon points={groundShape} className="homestead-daylight" />
      <g className="homestead-shadows" clipPath="url(#homestead-ground-clip)">
        {things.map((thing) => {
          const [x, y] = scenePt(thing.x, thing.y);
          return (
            <g key={thingKey(thing)} transform={`translate(${x} ${y})`}>
              <Shadow kind={thing.kind} rot={thing.rot} />
            </g>
          );
        })}
      </g>
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
/** The box of a bed's drawing, for what floats over the bed. */
const slotStyle = ([x, y]: Tile, zIndex: number) => ({ ...boxStyle(spriteBox("bed", x, y)), zIndex });

/** What floats over a bed: the strip of a growing turnip, or the arrow that says a ripe one can be gathered. */
function Float({ thing }: { thing: Thing }) {
  const growth = thing.turnip && growthOf(thing.turnip);
  if (!growth) return null;
  return (
    <span className="homestead-strip-slot" style={slotStyle([thing.x, thing.y], STRIP_Z)} aria-hidden="true">
      {growth.ripe ? (
        <span className="homestead-ripe">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="11" />
            <path d="M7 10l5 5.5 5-5.5" />
          </svg>
        </span>
      ) : (
        <span className="homestead-growbar">
          <span style={{ width: `${(100 * growth.since) / Math.max(1, growth.span)}%` }} />
        </span>
      )}
    </span>
  );
}

export function IsoScene({ home, cursor, marks, ghost, fits, burst, onTile, onHover }: Props) {
  const taken = new Set(home.things.flatMap((thing) => cells(thing.kind, thing.x, thing.y).map(([x, y]) => tileKey(x, y))));
  const rows: ReactNode[] = [];
  for (let y = 0; y < GROUND; y++) {
    const tiles: ReactNode[] = [];
    for (let x = 0; x < GROUND; x++) {
      const mark = marks.get(tileKey(x, y));
      const here = x === cursor[0] && y === cursor[1];
      tiles.push(
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
            {!taken.has(tileKey(x, y)) && <Decor x={x} y={y} />}
          </svg>
        </div>,
      );
    }
    rows.push(
      <div role="row" key={y} className="homestead-row">
        {tiles}
      </div>,
    );
  }
  const atCursor = thingAt(home, cursor[0], cursor[1]);
  // A thing being moved is in the hand: where it stood it is faint and casts no shadow.
  const lifted = ghost?.from && thingAt(home, ghost.from[0], ghost.from[1]);
  const ringOf = (thing: Thing) => {
    const mark = marks.get(tileKey(thing.x, thing.y));
    return `${mark === "target" || mark === "selected" ? ` is-${mark}` : ""}${thing === atCursor ? " is-cursor" : ""}${thing === lifted ? " is-lifted" : ""}`;
  };
  return (
    <div className={`homestead-iso${ghost ? " is-placing" : ""}`} style={SCENE}>
      <Land />
      {rows}
      <Sheet things={lifted ? home.things.filter((thing) => thing !== lifted) : home.things} />
      {home.things.map((thing, i) => (
        <span
          key={thingKey(thing)}
          className={`homestead-thing${ringOf(thing)}`}
          style={{ ...boxStyle(spriteBox(thing.kind, thing.x, thing.y)), "--i": i % 5 } as CSSProperties}
          onClick={() => onTile([thing.x, thing.y])}
          onPointerEnter={mouseOver(onHover, [thing.x, thing.y])}
          aria-hidden="true"
          data-thing={thing.kind}
        >
          <Art thing={thing} />
        </span>
      ))}
      <Critters home={home} />
      {home.things.map((thing) => (
        <Float key={`float-${thingKey(thing)}`} thing={thing} />
      ))}
      {burst && (
        <span key={burst.n} className="homestead-strip-slot" style={slotStyle(burst.at, MARK_Z + 2000)} aria-hidden="true">
          <span className="homestead-burst">+{burst.amount}</span>
        </span>
      )}
      <MarkLayer marks={marks} cursor={cursor} cursorOnThing={!!atCursor} onTile={onTile} onHover={onHover} />
      {ghost && (
        <span className={`homestead-thing homestead-ghost ${ghost.ok ? "is-ok" : "is-bad"}`} style={{ ...boxStyle(spriteBox(ghost.kind, ghost.x, ghost.y)), zIndex: 9999 }} aria-hidden="true">
          <Art thing={{ kind: ghost.kind, rot: ghost.rot ? 1 : 0 }} />
        </span>
      )}
    </div>
  );
}
