// The drawings of the things that stand on the ground, each built on its own
// footprint, so a 2×2 house stands on its four tiles. Every fill is a class
// in homestead.css. They only decorate: the scene's cells and the card carry
// the words.
import { poly, pt, viewBoxOf } from "./iso";
import type { Kind } from "./rules";

type P = [number, number, number];
const Face = ({ pts, className }: { pts: P[]; className: string }) => <polygon points={poly(...pts)} className={className} />;
/** The soft shadow a thing casts on its tiles. */
const Ground = ({ n }: { n: number }) => <Face pts={[[-0.08, -0.08, 0], [n + 0.08, -0.08, 0], [n + 0.08, n + 0.08, 0], [-0.08, n + 0.08, 0]]} className="g-ground" />;
const dot = (x: number, y: number, z: number, r: number, className: string) => {
  const [cx, cy] = pt(x, y, z);
  return <circle cx={cx} cy={cy} r={r} className={className} />;
};

function House() {
  return (
    <>
      <Ground n={2} />
      <Face pts={[[-0.1, -0.15, 52], [2.1, -0.15, 52], [2.1, 1, 92], [-0.1, 1, 92]]} className="g-roof-dark g-line-roof" />
      <Face pts={[[0.4, 0.7, 70], [0.7, 0.7, 70], [0.7, 0.7, 98], [0.4, 0.7, 98]]} className="g-wood-dark g-line" />
      <Face pts={[[0, 2, 0], [2, 2, 0], [2, 2, 56], [0, 2, 56]]} className="g-wall g-line" />
      <Face pts={[[2, 2, 0], [2, 0, 0], [2, 0, 56], [2, 1, 92], [2, 2, 56]]} className="g-wall-side g-line" />
      <Face pts={[[-0.1, 2.15, 52], [2.1, 2.15, 52], [2.1, 1, 92], [-0.1, 1, 92]]} className="g-roof g-line-roof" />
      <Face pts={[[2, 1.3, 0], [2, 0.7, 0], [2, 0.7, 30], [2, 1.3, 30]]} className="g-wood-dark g-line" />
      <Face pts={[[0.35, 2, 24], [0.85, 2, 24], [0.85, 2, 42], [0.35, 2, 42]]} className="g-window g-line" />
      <Face pts={[[1.15, 2, 24], [1.65, 2, 24], [1.65, 2, 42], [1.15, 2, 42]]} className="g-window g-line" />
      <Face pts={[[0.3, 2, 19], [0.9, 2, 19], [0.9, 2, 24], [0.3, 2, 24]]} className="g-wood-dark" />
      {dot(0.45, 2, 26, 3.5, "g-berry")}
      {dot(0.6, 2, 27, 3.5, "g-flower")}
      {dot(0.75, 2, 26, 3.5, "g-berry")}
    </>
  );
}

function Barn() {
  const [lx1, ly1] = pt(0, 2, 44);
  const [lx2, ly2] = pt(2, 2, 44);
  const brace = (a: P, b: P) => <polyline points={`${pt(...a).join(" ")} ${pt(...b).join(" ")}`} className="g-brace" />;
  return (
    <>
      <Ground n={2} />
      <Face pts={[[-0.1, -0.15, 46], [2.1, -0.15, 46], [2.1, 0.3, 80], [-0.1, 0.3, 80]]} className="g-barn-roof-dark g-line-roof" />
      <Face pts={[[-0.1, 0.3, 80], [2.1, 0.3, 80], [2.1, 1, 96], [-0.1, 1, 96]]} className="g-barn-roof g-line-roof" />
      <Face pts={[[0, 2, 0], [2, 2, 0], [2, 2, 50], [0, 2, 50]]} className="g-barn g-line-roof" />
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} className="g-trim" />
      <Face pts={[[2, 2, 0], [2, 0, 0], [2, 0, 50], [2, 0.3, 80], [2, 1, 96], [2, 1.7, 80], [2, 2, 50]]} className="g-barn-side g-line-roof" />
      <Face pts={[[-0.1, 1, 96], [2.1, 1, 96], [2.1, 1.7, 80], [-0.1, 1.7, 80]]} className="g-barn-roof g-line-roof" />
      <Face pts={[[-0.1, 1.7, 80], [2.1, 1.7, 80], [2.1, 2.15, 46], [-0.1, 2.15, 46]]} className="g-barn-roof-dark g-line-roof" />
      <Face pts={[[2, 1.4, 0], [2, 0.6, 0], [2, 0.6, 36], [2, 1.4, 36]]} className="g-wall g-line-roof" />
      {brace([2, 1.4, 0], [2, 0.6, 36])}
      {brace([2, 0.6, 0], [2, 1.4, 36])}
      {brace([2, 1, 0], [2, 1, 36])}
      <Face pts={[[2, 1.15, 60], [2, 0.85, 60], [2, 0.85, 72], [2, 1.15, 72]]} className="g-barn-hatch g-line-roof" />
    </>
  );
}

function Tree() {
  return (
    <>
      <ellipse cx="0" cy="24" rx="30" ry="14" className="g-ground" />
      <rect x="-5" y="-10" width="10" height="34" rx="2" className="g-trunk g-line" />
      <circle cx="0" cy="-32" r="28" className="g-leaf" />
      <circle cx="-18" cy="-16" r="18" className="g-leaf-light" />
      <circle cx="18" cy="-16" r="18" className="g-leaf-mid" />
      <circle cx="0" cy="-40" r="15" className="g-leaf-bright" />
    </>
  );
}

function Bush() {
  return (
    <>
      <ellipse cx="0" cy="24" rx="26" ry="12" className="g-ground" />
      <circle cx="-13" cy="10" r="16" className="g-leaf" />
      <circle cx="13" cy="10" r="16" className="g-leaf-light" />
      <circle cx="0" cy="2" r="15" className="g-leaf-bright" />
      <circle cx="-6" cy="8" r="3" className="g-berry" />
      <circle cx="8" cy="12" r="3" className="g-berry" />
      <circle cx="2" cy="-4" r="3" className="g-berry" />
    </>
  );
}

/** A fence runs through its tile's centre: along +x, or along +y when turned. */
function Fence({ rot }: { rot: number }) {
  const [ax, ay] = rot ? pt(0.5, 0, 0) : pt(0, 0.5, 0);
  const [bx, by] = rot ? pt(0.5, 1, 0) : pt(1, 0.5, 0);
  const along = (k: number): [number, number] => [ax + (bx - ax) * k, ay + (by - ay) * k];
  const rail = (z: number) => {
    const [x1, y1] = along(0.04);
    const [x2, y2] = along(0.96);
    return `${x1} ${y1 - z} ${x2} ${y2 - z} ${x2} ${y2 - z - 5} ${x1} ${y1 - z - 5}`;
  };
  return (
    <>
      <polygon points={`${ax} ${ay + 1} ${bx} ${by + 1} ${bx} ${by + 5} ${ax} ${ay + 5}`} className="g-ground" />
      <polygon points={rail(9)} className="g-fence g-line" />
      <polygon points={rail(18)} className="g-fence g-line" />
      {[0.08, 0.5, 0.92].map((k) => {
        const [x, y] = along(k);
        return <rect key={k} x={x - 3.5} y={y - 27} width="7" height="28" rx="1.5" className="g-fence-post g-line" />;
      })}
    </>
  );
}

/** Every kind but a bed, which Turnip.tsx draws. */
export function Sprite({ kind, rot = 0 }: { kind: Exclude<Kind, "bed">; rot?: number }) {
  return (
    <svg viewBox={viewBoxOf(kind)} aria-hidden="true" focusable="false" className="homestead-sprite" data-kind={kind}>
      {kind === "house" && <House />}
      {kind === "barn" && <Barn />}
      {kind === "fence" && <Fence rot={rot} />}
      {kind === "tree" && <Tree />}
      {kind === "bush" && <Bush />}
    </svg>
  );
}
