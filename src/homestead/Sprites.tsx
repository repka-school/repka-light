// The drawings of the things that stand on the ground, each built on its own
// footprint, so a 2×2 house stands on its four tiles, and all lit from the
// left. The shadow a thing casts is drawn apart (Shadow): the scene lays every
// shadow in one sheet under all the things. Every fill is a class in
// homestead.css. They only decorate: the scene's cells and the card carry the
// words.
import { Livestock } from "./Livestock";
import { PetSprite } from "./Critters";
import { Pond } from "./Pond";
import { pt, shadowOf, shadowPt, viewBoxOf } from "./iso";
import type { Kind } from "./rules";
import { Blobs, Box, dot, Edge, Face, flat, onX, onY, type Blob, type P } from "./shapes";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
/** Several separate strokes as one path. */
const strokes = (lines: [P, P][]) => lines.map(([a, b]) => `M${pt(...a).join(" ")}L${pt(...b).join(" ")}`).join("");

/** The dark a thing leaves where it meets the ground. */
const Ground = ({ n }: { n: number }) => <Face pts={flat(-0.06, n + 0.06, -0.06, n + 0.06, 0)} className="g-ground" />;

/** A window in a lit wall: shutters, a frame, four panes, and a box of flowers under it. */
function Window({ y, a }: { y: number; a: number }) {
  const b = a + 0.52;
  return (
    <>
      <Face pts={onY(y, a - 0.13, a, 19, 41)} className="g-shutter g-line" />
      <Face pts={onY(y, b, b + 0.13, 19, 41)} className="g-shutter g-line" />
      <Face pts={onY(y, a, b, 19, 41)} className="g-trim g-line" />
      <Face pts={onY(y, a + 0.05, b - 0.05, 22, 38)} className="g-glass" />
      <Face pts={[[a + 0.09, y, 36], [a + 0.2, y, 36], [a + 0.13, y, 24], [a + 0.08, y, 24]]} className="g-over g-glint" />
      <path d={strokes([[[(a + b) / 2, y, 22], [(a + b) / 2, y, 38]], [[a + 0.05, y, 30], [b - 0.05, y, 30]]])} className="g-mullion" />
      <Box x={[a - 0.03, b + 0.03]} y={[y, y + 0.09]} z={[13, 18]} lit="g-wood-dark g-line" shade="g-wood-dark g-line" top="g-bed-soil" />
      {range(5).map((i) => (
        <g key={i}>{dot(a + 0.03 + i * 0.115, y + 0.05, 20 + (i % 2), 2.6, i % 2 ? "g-flower" : "g-berry")}</g>
      ))}
    </>
  );
}

function House() {
  const eave = 52;
  const ridge = 92;
  const wall = 56;
  /** The near slope, from its eave (0) up to the ridge (1): the depth and the height there. */
  const slope = (t: number): [number, number] => [2.15 - 1.15 * t, eave + (ridge - eave) * t];
  const rows = range(5).map((i) => slope((i + 1) / 6));
  const laps = range(6).flatMap((row) => {
    const [y0, z0] = slope(row / 6);
    const [y1, z1] = slope((row + 1) / 6);
    return range(8).map((col): [P, P] => {
      const x = -0.1 + (col + (row % 2 ? 0.75 : 0.25)) * 0.275;
      return [[x, y0, z0], [x, y1, z1]];
    });
  });
  const [sx, sy] = pt(0.6, 0.64, 112);
  return (
    <>
      <Ground n={2} />
      {/* The far slope, seen edge on, and the chimney that stands behind the ridge. */}
      <Face pts={[[-0.1, -0.15, eave], [2.1, -0.15, eave], [2.1, 1, ridge], [-0.1, 1, ridge]]} className="g-roof-dark g-line-roof" />
      <Box x={[0.45, 0.75]} y={[0.5, 0.78]} z={[74, 106]} lit="g-brick g-line" shade="g-brick-side g-line" top="g-brick-side g-line" />
      <path d={strokes([[[0.45, 0.78, 93], [0.75, 0.78, 93]], [[0.45, 0.78, 99], [0.75, 0.78, 99]], [[0.75, 0.5, 96], [0.75, 0.78, 96]]])} className="g-seam" />
      <Box x={[0.41, 0.79]} y={[0.46, 0.82]} z={[106, 110]} lit="g-stone g-line" shade="g-stone-side g-line" top="g-stone-top g-line" />
      <g className="g-smoke" transform={`translate(${sx} ${sy})`}>
        <circle r="4" className="g-puff" />
        <circle r="4" className="g-puff" />
        <circle r="4" className="g-puff" />
      </g>
      {/* The lit wall: boards on a stone footing, darker under the eave, and two windows. */}
      <Face pts={onY(2, 0, 2, 0, wall)} className="g-wall g-line" />
      <Face pts={onY(2, 0, 2, 0, wall)} className="g-over g-sweep" />
      <path d={strokes([14, 22, 30, 38].map((z): [P, P] => [[0, 2, z], [2, 2, z]]))} className="g-board" />
      <Face pts={onY(2, 0, 2, 37, 46)} className="g-over g-shade" />
      <Face pts={onY(2, 0, 2, 0, 7)} className="g-stone g-line" />
      <path d={strokes([0.35, 0.8, 1.3, 1.7].map((x): [P, P] => [[x, 2, 0], [x, 2, 7]]))} className="g-seam" />
      <Window y={2} a={0.28} />
      <Window y={2} a={1.2} />
      {/* The shaded wall with its gable: the door on a stone step, and a window under the ridge. */}
      <Face pts={[[2, 2, 0], [2, 0, 0], [2, 0, wall], [2, 1, ridge], [2, 2, wall]]} className="g-wall-side g-line" />
      <path
        d={strokes([
          ...[14, 22, 30, 38, 46, 54].map((z): [P, P] => [[2, 0, z], [2, 2, z]]),
          ...[62, 70, 78].map((z): [P, P] => [[2, 1 - (ridge - z) / (ridge - wall), z], [2, 1 + (ridge - z) / (ridge - wall), z]]),
        ])}
        className="g-board"
      />
      <Face pts={onX(2, 0, 2, 0, 7)} className="g-stone-side g-line" />
      <path d={strokes([0.3, 1.6].map((y): [P, P] => [[2, y, 0], [2, y, 7]]))} className="g-seam" />
      <Face pts={onX(2, 0.64, 1.36, 0, 35)} className="g-trim-side g-line" />
      <Face pts={onX(2, 0.71, 1.29, 0, 31)} className="g-door g-line" />
      <Face pts={onX(2, 0.79, 1.21, 17, 27)} className="g-panel" />
      <Face pts={onX(2, 0.79, 1.21, 5, 13)} className="g-panel" />
      {dot(2, 0.8, 16, 1.6, "g-flower")}
      <Box x={[2, 2.26]} y={[0.56, 1.44]} z={[0, 4]} lit="g-stone g-line" shade="g-stone-side g-line" top="g-stone-top g-line" />
      <Face pts={onX(2, 0.83, 1.17, 61, 76)} className="g-trim-side g-line" />
      <Face pts={onX(2, 0.88, 1.12, 64, 73)} className="g-glass" />
      {/* The near slope: rows of shingles, the board along the eave and the one up the gable. */}
      <Face pts={onY(2.15, -0.1, 2.1, eave - 4, eave)} className="g-roof-edge g-line-roof" />
      <Face pts={[[-0.1, 2.15, eave], [2.1, 2.15, eave], [2.1, 1, ridge], [-0.1, 1, ridge]]} className="g-roof g-line-roof" />
      <Face pts={[[-0.1, 2.15, eave], [2.1, 2.15, eave], [2.1, 1, ridge], [-0.1, 1, ridge]]} className="g-over g-sweep" />
      <path d={strokes(rows.map(([y, z]): [P, P] => [[-0.1, y, z], [2.1, y, z]]))} className="g-shingle" />
      <path d={strokes(laps)} className="g-shingle g-shingle-lap" />
      <Face pts={[[2.1, 2.15, eave], [2.1, 1, ridge], [2.1, -0.15, eave], [2.1, -0.15, eave - 4], [2.1, 1, ridge - 5], [2.1, 2.15, eave - 4]]} className="g-roof-edge g-line-roof" />
      <Edge pts={[[-0.1, 1, ridge], [2.1, 1, ridge]]} className="g-ridge" />
    </>
  );
}

function Barn() {
  const eave = 46;
  const knee = 80;
  const ridge = 96;
  const wall = 50;
  /** How high the gable wall stands at depth y, under the bent roof. */
  const roofAt = (y: number) => {
    const d = Math.abs(y - 1);
    return d > 0.7 ? wall + ((1 - d) / 0.3) * (knee - wall) : knee + ((0.7 - d) / 0.7) * (ridge - knee);
  };
  const boards = range(9).map((i) => 0.2 + i * 0.2);
  return (
    <>
      <Ground n={2} />
      <Face pts={[[-0.1, -0.15, eave], [2.1, -0.15, eave], [2.1, 0.3, knee], [-0.1, 0.3, knee]]} className="g-barn-roof-dark g-line-roof" />
      <Face pts={[[-0.1, 0.3, knee], [2.1, 0.3, knee], [2.1, 1, ridge], [-0.1, 1, ridge]]} className="g-barn-roof g-line-roof" />
      {/* The lit wall: upright boards, pale trim, and a window. */}
      <Face pts={onY(2, 0, 2, 0, wall)} className="g-barn g-line-roof" />
      <Face pts={onY(2, 0, 2, 0, wall)} className="g-over g-sweep" />
      <path d={strokes(boards.map((x): [P, P] => [[x, 2, 6], [x, 2, wall]]))} className="g-plank" />
      <Face pts={onY(2, 0, 2, 35, 42)} className="g-over g-shade" />
      <Face pts={onY(2, 0, 2, 0, 6)} className="g-stone g-line" />
      <path d={strokes([[[0.04, 2, 6], [0.04, 2, 40]], [[1.96, 2, 6], [1.96, 2, 40]], [[0, 2, 33], [2, 2, 33]]])} className="g-trim-line" />
      <Face pts={onY(2, 0.72, 1.28, 12, 30)} className="g-trim g-line-roof" />
      <Face pts={onY(2, 0.78, 1.22, 15, 27)} className="g-glass" />
      <path d={strokes([[[1, 2, 15], [1, 2, 27]], [[0.78, 2, 21], [1.22, 2, 21]]])} className="g-mullion" />
      {/* The shaded gable wall: the doors with their braces, and the loft's hatch with hay in it. */}
      <Face pts={[[2, 2, 0], [2, 0, 0], [2, 0, wall], [2, 0.3, knee], [2, 1, ridge], [2, 1.7, knee], [2, 2, wall]]} className="g-barn-side g-line-roof" />
      <path d={strokes(boards.map((y): [P, P] => [[2, y, 6], [2, y, roofAt(y) - 2]]))} className="g-plank" />
      <Face pts={onX(2, 0, 2, 0, 6)} className="g-stone-side g-line" />
      <Edge pts={[[2, 0.06, 47], [2, 0.34, 76.5], [2, 1, 91.5], [2, 1.66, 76.5], [2, 1.94, 47]]} className="g-trim-line g-trim-line-side" />
      <Face pts={onX(2, 0.5, 1.5, 0, 40)} className="g-trim-side g-line-roof" />
      <Face pts={onX(2, 0.57, 1.43, 0, 36)} className="g-barn-door" />
      <path
        d={strokes([
          [[2, 1, 0], [2, 1, 36]],
          [[2, 0.57, 0], [2, 1, 36]],
          [[2, 1, 0], [2, 0.57, 36]],
          [[2, 1, 0], [2, 1.43, 36]],
          [[2, 1.43, 0], [2, 1, 36]],
        ])}
        className="g-brace"
      />
      <Face pts={onX(2, 0.8, 1.2, 55, 76)} className="g-trim-side g-line-roof" />
      <Face pts={onX(2, 0.86, 1.14, 58, 73)} className="g-barn-hatch" />
      <Face pts={[[2, 0.86, 58], [2, 1.14, 58], [2, 1.12, 63], [2, 1.02, 61], [2, 0.95, 65], [2, 0.88, 62]]} className="g-hay" />
      {/* The near side of the roof: two pitches of seamed sheets, and the board up the gable. */}
      <Face pts={[[-0.1, 1, ridge], [2.1, 1, ridge], [2.1, 1.7, knee], [-0.1, 1.7, knee]]} className="g-barn-roof g-line-roof" />
      <Face pts={[[-0.1, 1.7, knee], [2.1, 1.7, knee], [2.1, 2.15, eave], [-0.1, 2.15, eave]]} className="g-barn-roof-dark g-line-roof" />
      <Face pts={[[-0.1, 1, ridge], [2.1, 1, ridge], [2.1, 1.7, knee], [2.1, 2.15, eave], [-0.1, 2.15, eave], [-0.1, 1.7, knee]]} className="g-over g-sweep" />
      {range(7).map((i) => {
        const x = 0.2 + i * 0.3;
        return <Edge key={i} pts={[[x, 1, ridge], [x, 1.7, knee], [x, 2.15, eave]]} className="g-seam g-seam-roof" />;
      })}
      <Face
        pts={[[2.1, 2.15, eave], [2.1, 1.7, knee], [2.1, 1, ridge], [2.1, 0.3, knee], [2.1, -0.15, eave], [2.1, -0.15, eave - 4], [2.1, 0.3, knee - 4.5], [2.1, 1, ridge - 4.5], [2.1, 1.7, knee - 4.5], [2.1, 2.15, eave - 4]]}
        className="g-barn-roof-edge g-line-roof"
      />
      <Edge pts={[[-0.1, 1, ridge], [2.1, 1, ridge]]} className="g-ridge" />
    </>
  );
}

const crown: Blob[] = [[0, -44, 30], [-24, -30, 19], [24, -30, 19], [-13, -62, 17], [14, -60, 18], [0, -18, 17], [-30, -46, 13], [31, -46, 12]];
const crownMid: Blob[] = [[-3, -48, 26], [-25, -33, 15], [20, -35, 15], [-12, -64, 13], [12, -63, 13], [-2, -22, 13]];
const crownLight: Blob[] = [[-9, -54, 17], [-27, -37, 9], [13, -43, 10], [-10, -68, 8], [14, -66, 7], [-6, -26, 7]];
const crownBright: Blob[] = [[-13, -60, 8], [-29, -40, 4.5], [9, -47, 4.5], [-11, -71, 3.5]];
const apples: [number, number][] = [[-18, -23], [9, -29], [25, -39], [-1, -41], [-31, -34], [17, -14]];
/** Little arcs that break a mass of leaves into leaves. */
const arcs = (at: [number, number][]) => at.map(([x, y]) => `M${x} ${y}q3 -3.4 6.4 -0.4`).join("");

/** An apple tree. Its crown sways a little, about the top of the trunk. */
function Tree() {
  return (
    <>
      <ellipse cx="0" cy="26" rx="17" ry="7.5" className="g-ground" />
      <path d="M-8 28C-5 23-4.5 10-5-6L-12-20-8-23-1-10 1-26 5-26 5-8 11-19 15-16 6-2C5.5 10 5 23 8 28Q0 31.5-8 28Z" className="g-trunk g-line" />
      <path d="M1.5-4C2 10 2 22 3.5 29.6Q6 29.2 8 28C5 23 5.5 10 6-2L15-16 11-19 5-8 5-26 3-26Z" className="g-over g-shade" />
      <path d="M-2.5 4q1 4 0 8M-1 16q1.4 3 0.6 7M-3.4 13q0.6 2 0 4" className="g-bark" />
      <path d="M-9 28q-1-4-4-6M-6.5 29q0-4-1.6-7M7 29q0.5-4 3-6.5M9.5 28q1.4-3 4-4" className="g-blade" />
      <g className="g-sway">
        <Blobs at={crown} className="g-leaf g-leaf-rim" />
        <Blobs at={crown} className="g-leaf" />
        <Blobs at={crownMid} className="g-leaf-mid" />
        <Blobs at={crownLight} className="g-leaf-light" />
        <Blobs at={crownBright} className="g-leaf-bright" />
        <path d={arcs([[-22, -50], [-6, -40], [-30, -30], [-14, -30], [2, -58], [-20, -66], [-2, -70]])} className="g-leaf-mark" />
        <path d={arcs([[14, -24], [26, -30], [6, -12], [-10, -10], [20, -52], [30, -44], [-22, -18]])} className="g-leaf-fold" />
        {apples.map(([x, y]) => (
          <g key={`${x} ${y}`}>
            <circle cx={x} cy={y} r="3" className="g-berry" />
            <circle cx={x - 1} cy={y - 1} r="0.9" className="g-over g-glint" />
          </g>
        ))}
      </g>
    </>
  );
}

const shrub: Blob[] = [[-15, 13, 14], [14, 13, 14], [0, 4, 16], [0, 17, 13], [-24, 19, 8], [24, 19, 8]];
const shrubMid: Blob[] = [[-15, 10, 11.5], [11, 10, 11.5], [-2, 1, 13], [-3, 15, 9]];
const shrubLight: Blob[] = [[-17, 7, 7], [-4, -3, 8.5], [10, 6, 6]];
const shrubBright: Blob[] = [[-18, 5, 3.5], [-6, -6, 4], [8, 4, 2.5]];
const berries: [number, number][] = [[-8, 9], [7, 13], [1, -3], [17, 8], [-20, 15], [-1, 19]];

function Bush() {
  return (
    <>
      <ellipse cx="0" cy="26" rx="28" ry="9" className="g-ground" />
      <Blobs at={shrub} className="g-leaf g-leaf-rim" />
      <Blobs at={shrub} className="g-leaf" />
      <Blobs at={shrubMid} className="g-leaf-mid" />
      <Blobs at={shrubLight} className="g-leaf-light" />
      <Blobs at={shrubBright} className="g-leaf-bright" />
      <path d={arcs([[-12, 2], [-24, 12], [-6, 12]])} className="g-leaf-mark" />
      <path d={arcs([[10, 20], [18, 16], [-8, 24], [4, 6]])} className="g-leaf-fold" />
      {berries.map(([x, y]) => (
        <g key={`${x} ${y}`}>
          <circle cx={x} cy={y} r="2.6" className="g-berry" />
          <circle cx={x - 0.8} cy={y - 0.8} r="0.8" className="g-over g-glint" />
        </g>
      ))}
    </>
  );
}

/**
 * A fence runs through its tile's centre from edge to edge, so fences on
 * neighbouring tiles join: along +x, or along +y when turned. Its rails face
 * the light when it runs along +x and are in the shade when turned.
 */
function Fence({ rot }: { rot: number }) {
  const [ax, ay] = rot ? pt(0.5, 0, 0) : pt(0, 0.5, 0);
  const [bx, by] = rot ? pt(0.5, 1, 0) : pt(1, 0.5, 0);
  const along = (k: number): [number, number] => [ax + (bx - ax) * k, ay + (by - ay) * k];
  const rail = (z: number, h: number) => `${ax} ${ay - z} ${bx} ${by - z} ${bx} ${by - z - h} ${ax} ${ay - z - h}`;
  return (
    <>
      <polygon points={`${ax} ${ay} ${bx} ${by} ${bx + 5} ${by + 2} ${ax + 5} ${ay + 2}`} className="g-ground" />
      {[8, 18].map((z) => (
        <g key={z}>
          <polygon points={rail(z, 5.5)} className={`${rot ? "g-fence-shade" : "g-fence"} g-line`} />
          <line x1={ax} y1={ay - z - 4.3} x2={bx} y2={by - z - 4.3} className="g-fence-lit" />
        </g>
      ))}
      {[0, 0.5, 1].map((k) => {
        const [x, y] = along(k);
        return (
          <g key={k}>
            <path d={`M${x - 3.6} ${y + 1.5}V${y - 26}L${x} ${y - 30.5}L${x + 3.6} ${y - 26}V${y + 1.5}Z`} className="g-fence-post g-line" />
            <path d={`M${x + 0.8} ${y + 1.5}V${y - 29.5}L${x + 3.6} ${y - 26}V${y + 1.5}Z`} className="g-over g-shade" />
          </g>
        );
      })}
    </>
  );
}

/** Every kind but a bed, which Turnip.tsx draws. */
export function Sprite({ kind, rot = 0, placed = false }: { kind: Exclude<Kind, "bed">; rot?: number; placed?: boolean }) {
  return (
    <svg viewBox={viewBoxOf(kind)} aria-hidden="true" focusable="false" className="homestead-sprite" data-kind={kind}>
      {kind === "pond" && <Pond animate={placed} />}
      {(kind === "chicken" || kind === "cow") && <g transform="translate(0 26)"><Livestock kind={kind} /></g>}
      {(kind === "cat" || kind === "dog") && <PetSprite kind={kind} shelterOnly={placed} />}
      {kind === "house" && <House />}
      {kind === "barn" && <Barn />}
      {kind === "fence" && <Fence rot={rot} />}
      {kind === "tree" && <Tree />}
      {kind === "bush" && <Bush />}
    </svg>
  );
}

/** The corners of a block on a square footprint, on the ground and at its top. */
const block = (x0: number, x1: number, y0: number, y1: number, z: number): P[] => [...flat(x0, x1, y0, y1, 0), ...flat(x0, x1, y0, y1, z)];

/** The shadow a thing casts on the ground, in the thing's own space. */
export function Shadow({ kind, rot = 0 }: { kind: Kind; rot?: number }) {
  if (kind === "house") return <polygon points={shadowOf([...block(-0.1, 2.1, -0.15, 2.15, 52), [-0.1, 1, 92], [2.1, 1, 92], [0.45, 0.5, 110], [0.75, 0.78, 110]])} />;
  if (kind === "barn") return <polygon points={shadowOf([...block(-0.1, 2.1, -0.15, 2.15, 46), ...flat(-0.1, 2.1, 0.3, 1.7, 80), [-0.1, 1, 96], [2.1, 1, 96]])} />;
  if (kind === "bed") return <polygon points={shadowOf(block(-0.05, 1.05, -0.05, 1.05, 11))} />;
  if (kind === "fence") return <polygon points={shadowOf(rot ? block(0.46, 0.54, 0, 1, 28) : block(0, 1, 0.46, 0.54, 28))} />;
  if (kind === "pond" || kind === "chicken" || kind === "cow") return null;
  if (kind === "cat" || kind === "dog") return <ellipse cx="6" cy="28" rx="22" ry={22 * .36} />;
  const [x, y] = pt(0.5, 0.5, 0);
  if (kind === "bush") {
    const [cx, cy] = shadowPt(0.5, 0.5, 14);
    return <ellipse cx={cx} cy={cy} rx="29" ry="13" />;
  }
  const [cx, cy] = shadowPt(0.5, 0.5, 64);
  return (
    <>
      <line x1={x} y1={y} x2={cx} y2={cy} className="s-stem" />
      <ellipse cx={cx} cy={cy} rx="36" ry="17" />
    </>
  );
}
