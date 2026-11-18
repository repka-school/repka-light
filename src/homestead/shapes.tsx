// The pieces the drawings are built from: flat faces set in the scene's
// projection, and the shared paints (hatches and soft light) they are filled
// with. A face turned to +y is in the light, a face turned to +x in the shade.
import { poly, pt } from "./iso";

export type P = [x: number, y: number, z: number];

export const Face = ({ pts, className }: { pts: P[]; className: string }) => <polygon points={poly(...pts)} className={className} />;
/** A line through ground points, not closed. */
export const Edge = ({ pts, className }: { pts: P[]; className: string }) => <polyline points={poly(...pts)} className={className} />;

/** A rectangle on a wall that faces +y, standing at depth y: from a to b along x, from z0 up to z1. */
export const onY = (y: number, a: number, b: number, z0: number, z1: number): P[] => [[a, y, z0], [b, y, z0], [b, y, z1], [a, y, z1]];
/** A rectangle on a wall that faces +x, standing at depth x: from a to b along y, from z0 up to z1. */
export const onX = (x: number, a: number, b: number, z0: number, z1: number): P[] => [[x, a, z0], [x, b, z0], [x, b, z1], [x, a, z1]];
/** A level rectangle at height z. */
export const flat = (x0: number, x1: number, y0: number, y1: number, z: number): P[] => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];

type BoxProps = { x: [number, number]; y: [number, number]; z: [number, number]; lit: string; shade: string; top: string };
/** The three faces of a box that can be seen: the lit one, the shaded one and the top. */
export function Box({ x, y, z, lit, shade, top }: BoxProps) {
  return (
    <>
      <Face pts={onY(y[1], x[0], x[1], z[0], z[1])} className={lit} />
      <Face pts={onX(x[1], y[0], y[1], z[0], z[1])} className={shade} />
      <Face pts={flat(x[0], x[1], y[0], y[1], z[1])} className={top} />
    </>
  );
}

export const dot = (x: number, y: number, z: number, r: number, className: string) => {
  const [cx, cy] = pt(x, y, z);
  return <circle cx={cx} cy={cy} r={r} className={className} />;
};

export type Blob = [cx: number, cy: number, r: number];
/** Round masses of leaves, in a drawing's own flat space. */
export const Blobs = ({ at, className }: { at: Blob[]; className: string }) => (
  <>
    {at.map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} className={className} />
    ))}
  </>
);

/**
 * The paints every drawing on the page shares, defined once: the hatch on a
 * tile that fits and on one that does not, so the two are not told by colour
 * alone, and the soft light laid over faces, round shapes and glass.
 */
export function Paints() {
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
        {/* Light across a face: brighter toward the left, where it comes from. */}
        <linearGradient id="homestead-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="hs-lit" stopOpacity="0.24" />
          <stop offset="0.5" className="hs-lit" stopOpacity="0" />
          <stop offset="0.5" className="hs-dim" stopOpacity="0" />
          <stop offset="1" className="hs-dim" stopOpacity="0.2" />
        </linearGradient>
        {/* Light on a round shape: a glow at its upper left, shade round its lower right. */}
        <radialGradient id="homestead-ball" cx="0.34" cy="0.3" r="0.8">
          <stop offset="0" className="hs-lit" stopOpacity="0.5" />
          <stop offset="0.45" className="hs-lit" stopOpacity="0" />
          <stop offset="0.55" className="hs-dim" stopOpacity="0" />
          <stop offset="1" className="hs-dim" stopOpacity="0.34" />
        </radialGradient>
        <linearGradient id="homestead-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="hs-glass-light" />
          <stop offset="1" className="hs-glass" />
        </linearGradient>
        {/* The soft shadow under the slab of earth. */}
        <radialGradient id="homestead-under">
          <stop offset="0.35" className="hs-dim" stopOpacity="0.34" />
          <stop offset="1" className="hs-dim" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
