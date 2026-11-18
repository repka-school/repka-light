// A raised bed of boards on its tile and the turnip in it, in ten stages for
// each of four qualities. Each stage has its own outline: the leaves are counted up
// one by one, then the bulb shows and swells. Each quality has its palette
// and a mark on a tag beside the bed (none, a diamond, a star, a crown), so
// the quality is never told by colour alone. Fills are classes in
// homestead.css; the names are written by the scene's cells and the card.
import { pt, viewBoxOf } from "./iso";
import { STAGES, type Quality } from "./rules";
import { Box, Edge, Face, flat, onX, onY } from "./shapes";

type V = [number, number];
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const fmt = (v: V) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;

/** By stage: how many leaves, a leaf's length and width, the bulb's radius and how far it rises from the soil. */
const growth = [
  { leaves: 0, length: 0, width: 0, r: 0, lift: 0 },
  { leaves: 1, length: 20, width: 6, r: 0, lift: 0 },
  { leaves: 2, length: 29, width: 7, r: 0, lift: 0 },
  { leaves: 3, length: 35, width: 8, r: 0, lift: 0 },
  { leaves: 4, length: 40, width: 9, r: 0, lift: 0 },
  { leaves: 5, length: 44, width: 10, r: 7, lift: 0.3 },
  { leaves: 7, length: 47, width: 11, r: 11, lift: 0.35 },
  { leaves: 9, length: 52, width: 12, r: 14, lift: 0.4 },
  { leaves: 7, length: 46, width: 12.5, r: 22, lift: 0.55 },
  { leaves: 9, length: 56, width: 13.5, r: 28, lift: 0.85 },
];

type LeafShape = { base: V; phi: number; tilt: number; length: number; width: number; shade: string; curl: number; droop: number };

/** A leaf from `base` along the ground direction `phi`, rising by `tilt`, projected the way the tiles are. */
function Leaf({ base, phi, tilt, length, width, shade, curl, droop }: LeafShape) {
  const g = (Math.cos(tilt) * length) / Math.SQRT2;
  const z = Math.sin(tilt) * length;
  const dir: V = [(Math.cos(phi) - Math.sin(phi)) * g, ((Math.cos(phi) + Math.sin(phi)) * g) / 2 - z];
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const d = unit(dir);
  const n: V = [-d[1], d[0]];
  const at = (k: number, w: number): V => {
    const p = add(add(base, d, len * k), n, w);
    return [p[0], p[1] + droop * len * k * k];
  };
  const tip = at(1, curl * width * 0.6);
  const blade = `M${fmt(base)}C${fmt(at(0.3, width))} ${fmt(at(0.78, width * 0.95))} ${fmt(tip)}C${fmt(at(0.78, -width * 0.95))} ${fmt(at(0.3, -width))} ${fmt(base)}Z`;
  const vein = `M${fmt(base)}C${fmt(at(0.3, curl * width * 0.2))} ${fmt(at(0.7, curl * width * 0.3))} ${fmt(at(0.9, curl * width * 0.5))}`;
  return (
    <g>
      <path d={blade} className={`${shade} t-line`} />
      <path d={vein} className="t-vein" />
    </g>
  );
}

/** The leaves all round the crown, those at the back first. */
function rosette(count: number, length: number, width: number, base: V): LeafShape[] {
  return Array.from({ length: count }, (_, i) => {
    // The first leaf stands at the back, so a lone sprout rises rather than lies.
    const phi = Math.PI * 1.25 + (i * 2 * Math.PI) / count + (i % 2 ? 0.12 : -0.12);
    const back = (1 + Math.cos(phi - Math.PI * 1.25)) / 2;
    const tilt = (0.2 + 0.75 * back) * (Math.PI / 2) * 0.9;
    const size = length * (0.72 + 0.28 * back) * (i % 2 ? 0.9 : 1);
    const lit = Math.cos(phi - Math.PI * 1.25) * 0.5 + 0.5;
    const screenY = ((Math.cos(phi) + Math.sin(phi)) * Math.cos(tilt) * size) / 2 / Math.SQRT2 - Math.sin(tilt) * size;
    const shade = lit > 0.66 ? "t-leaf-light" : lit > 0.33 ? "t-leaf" : "t-leaf-dark";
    return { base, phi, tilt, length: size, width: width * (0.8 + 0.2 * Math.cos(phi)), shade, curl: Math.sin(phi) > 0 ? -0.35 : 0.35, droop: 0.1 + 0.3 * (1 - back), screenY };
  }).sort((a, b) => a.screenY - b.screenY);
}

const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}q${r * 0.15} ${r * 0.85} ${r} ${r}q${-r * 0.85} ${r * 0.15} ${-r} ${r}q${-r * 0.15} ${-r * 0.85} ${-r} ${-r}q${r * 0.85} ${-r * 0.15} ${r} ${-r}Z`;

/** The part of the bulb above the soil. */
function Bulb({ r, cy }: { r: number; cy: number }) {
  const hx = Math.sqrt(Math.max(0, r * r - cy * cy));
  const blushY = cy - r * 0.17;
  const bx = r * 0.985;
  return (
    <g>
      <ellipse cx="0" cy="1" rx={hx * 1.15 + 2} ry={hx * 0.45 + 1} className="g-bed-hole" />
      <path d={`M${-hx} 0A${r} ${r} 0 1 1 ${hx} 0A${hx} ${hx * 0.4} 0 0 1 ${-hx} 0Z`} className="t-bulb t-ink-line" />
      <path d={`M${-bx} ${blushY}A${r} ${r} 0 0 1 ${bx} ${blushY}A${bx} ${r * 0.36} 0 0 1 ${-bx} ${blushY}Z`} className="t-blush" />
      <path d={`M${-hx} 0A${r} ${r} 0 1 1 ${hx} 0A${hx} ${hx * 0.4} 0 0 1 ${-hx} 0Z`} className="g-over g-ball" />
      <ellipse cx={-r * 0.42} cy={cy - r * 0.52} rx={r * 0.3} ry={r * 0.14} transform={`rotate(-35 ${-r * 0.42} ${cy - r * 0.52})`} className="g-gloss" />
      <path d={`M${-hx} 0A${hx} ${hx * 0.4} 0 0 0 ${hx} 0`} className="t-soil-cut" />
    </g>
  );
}

/** The turnip alone, standing at (0, 0) on the soil, lit from the upper left. */
function TurnipArt({ type, stage }: { type: Quality; stage: number }) {
  const g = growth[Math.min(STAGES, Math.max(1, stage)) - 1];
  const ripe = stage >= STAGES;
  if (g.leaves === 0) {
    return (
      <g className={`turnip-${type}`}>
        <ellipse cx="0" cy="0" rx="12" ry="5" className="g-bed-furrow" />
        <ellipse cx="0" cy="-2.5" rx="5" ry="3.4" transform="rotate(-20)" className="g-wood-dark g-line" />
      </g>
    );
  }
  const cy = -g.r * g.lift;
  const crown: V = [0, g.r ? cy - g.r * 0.9 : -1];
  return (
    <g className={`turnip-${type}`}>
      {ripe && type === "legendary" && <circle cx="0" cy={cy} r={g.r + 26} className="t-glow" />}
      <ellipse cx={g.r * 0.35 + 2} cy="1.5" rx={Math.max(9, g.r * 1.25)} ry={Math.max(3.5, g.r * 0.42)} className="g-bed-shade" />
      {g.r > 0 ? <Bulb r={g.r} cy={cy} /> : <ellipse cx="0" cy="0" rx="8" ry="3" className="g-bed-soil" />}
      {rosette(g.leaves, g.length, g.width, crown).map((leaf, i) => (
        <Leaf key={i} {...leaf} />
      ))}
      {g.r > 0 && <ellipse cx={crown[0]} cy={crown[1] + 1} rx={g.r * 0.22} ry={g.r * 0.09} className="t-deep t-ink-line" />}
      {ripe && (
        <>
          <path d={sparkle(g.r + 9, cy - g.r * 0.6, 5)} className="t-sparkle" />
          <path d={sparkle(-g.r - 7, cy + g.r * 0.1, 3.5)} className="t-sparkle" />
        </>
      )}
    </g>
  );
}

/** A quality's mark, drawn around (0, 0): none for common, a diamond outline, a star, a crown. */
function Mark({ type }: { type: Quality }) {
  if (type === "rare") return <path d="M0 -6L6 0L0 6L-6 0Z" className="t-mark-outline" />;
  if (type === "epic") return <polygon points="0 -6.2 1.5 -2.1 5.9 -1.9 2.5 0.8 3.6 5 0 2.6 -3.6 5 -2.5 0.8 -5.9 -1.9 -1.5 -2.1" className="t-mark" />;
  if (type === "legendary") return <path d="M-6 4L-7 -5L-3 -1L0 -6L3 -1L7 -5L6 4Z" className="t-mark" />;
  return null;
}

/** The quality's mark on a tag staked at the bed's front corner. */
function BedTag({ type }: { type: Quality }) {
  if (type === "common") return null;
  const [x, y] = pt(1, 0.62, 9);
  const cy = y - 24;
  return (
    <g className={`turnip-${type}`}>
      <line x1={x} y1={y} x2={x} y2={cy + 9} className="t-stake" />
      <rect x={x - 9} y={cy - 9} width="18" height="18" rx="3" className="t-tag" />
      <g transform={`translate(${x} ${cy})`}>
        <Mark type={type} />
      </g>
    </g>
  );
}

/** A seed not yet planted, with its quality's mark beside it. */
export function Seed({ type }: { type: Quality }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={`turnip-${type}`}>
      <ellipse cx="17" cy="33" rx="12" ry="3" className="g-ground" />
      <path d="M17 8C25 14 27 24 24 30C21 34 13 34 10 30C7 24 9 14 17 8Z" className="g-wood-dark g-line" />
      <path d="M14 15C12 19 12 24 13 27" className="g-seed-shine" />
      {type !== "common" && (
        <g transform="translate(30 10) scale(0.9)">
          <rect x="-9" y="-9" width="18" height="18" rx="3" className="t-tag" />
          <Mark type={type} />
        </g>
      )}
    </svg>
  );
}

/** The corner of the frame at (x, y): a short post a little taller than the boards. */
const Post = ({ x, y, z }: { x: number; y: number; z: number }) => (
  <Box x={[x - 0.065, x + 0.065]} y={[y - 0.065, y + 0.065]} z={[0, z]} lit="g-bed-front g-line" shade="g-bed-side g-line" top="g-bed-top g-line" />
);

/** A raised bed exactly on its tile: a frame of two boards with a post at each corner, raked soil, and its turnip if it has one. */
export function Bed({ turnip }: { turnip?: { type: Quality; stage: number } }) {
  const z = 9;
  const lo = -0.04;
  const hi = 1.04;
  const [sx, sy] = pt(0.5, 0.5, z);
  return (
    <svg viewBox={viewBoxOf("bed")} aria-hidden="true" focusable="false" className="homestead-sprite" data-kind="bed" data-quality={turnip?.type} data-stage={turnip?.stage}>
      <Face pts={flat(lo - 0.05, hi + 0.05, lo - 0.05, hi + 0.05, 0)} className="g-ground" />
      <Post x={lo} y={lo} z={z + 3} />
      <Face pts={onY(hi, lo, hi, 0, z)} className="g-bed-front g-line" />
      <Face pts={onX(hi, lo, hi, 0, z)} className="g-bed-side g-line" />
      <Edge pts={[[lo, hi, z / 2], [hi, hi, z / 2], [hi, lo, z / 2]]} className="g-seam" />
      <Face pts={flat(lo, hi, lo, hi, z)} className="g-bed-top g-line" />
      <Face pts={flat(0.07, 0.93, 0.07, 0.93, z)} className="g-bed-soil g-furrow-line" />
      {/* The far boards shade the soil beside them. */}
      <Face pts={[[0.07, 0.07, z], [0.16, 0.07, z], [0.16, 0.84, z], [0.93, 0.84, z], [0.93, 0.93, z], [0.07, 0.93, z]]} className="g-over g-shade" />
      {[0.26, 0.46, 0.66].map((y) => (
        <g key={y}>
          <Edge pts={[[0.2, y, z], [0.88, y, z]]} className="g-furrow" />
          <Edge pts={[[0.2, y - 0.07, z], [0.88, y - 0.07, z]]} className="g-furrow-lit" />
        </g>
      ))}
      <Post x={lo} y={hi} z={z + 3} />
      <Post x={hi} y={lo} z={z + 3} />
      {turnip && (
        <g transform={`translate(${sx} ${sy})`}>
          {/* Keyed by its stage: a turnip that has just grown is drawn anew, which shows it swelling. */}
          <g key={turnip.stage} className="t-grown">
            <TurnipArt type={turnip.type} stage={turnip.stage} />
          </g>
        </g>
      )}
      <Post x={hi} y={hi} z={z + 3} />
      {turnip && <BedTag type={turnip.type} />}
    </svg>
  );
}
