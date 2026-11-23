// The isometric projection the scene and its drawings share: a tile is 96×48
// on screen; +x runs down-right, +y down-left, z up. Pure numbers.
import { footprint, GROUND, type Kind } from "./rules";

export const TILE_W = 96;
const TILE_H = 48;
/** Headroom above the ground's top corner for the tallest drawing. */
const TOP = 120;

/** A ground point (x, y) at height z, in a drawing's own space, whose origin is its footprint's top corner. */
export const pt = (x: number, y: number, z: number): [number, number] => [x * 48 - y * 48, x * 24 + y * 24 - z];
/** An SVG points list of ground points. */
export const poly = (...points: [number, number, number][]) => points.map((p) => pt(...p).join(" ")).join(" ");

/** Room beside the ground for what overhangs it, and under it for the slab of earth it lies on. */
const SIDE = 40;
const BOTTOM = 96;

/** The whole scene's size. */
export const SCENE = { width: GROUND * TILE_W + 2 * SIDE, height: GROUND * TILE_H + TOP + BOTTOM };

/** A ground point (x, y) at height z in the scene's own space. */
export const scenePt = (x: number, y: number, z = 0): [number, number] => [SCENE.width / 2 + ((x - y) * TILE_W) / 2, TOP + ((x + y) * TILE_H) / 2 - z];

/** The ground point under a scene point: the projection undone at height 0. */
export function groundAt(sx: number, sy: number): [number, number] {
  const u = (sx - SCENE.width / 2) / (TILE_W / 2);
  const v = (sy - TOP) / (TILE_H / 2);
  return [(u + v) / 2, (v - u) / 2];
}

/** A tile's diamond box in the scene. */
export function tileBox(x: number, y: number) {
  return { left: SCENE.width / 2 + ((x - y) * TILE_W) / 2 - TILE_W / 2, top: TOP + ((x + y) * TILE_H) / 2, width: TILE_W, height: TILE_H };
}

/** A tile's centre in the scene. */
export function tileCentre(x: number, y: number) {
  const box = tileBox(x, y);
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

type Box = { minX: number; minY: number; width: number; height: number };
/** Each drawing's box around its footprint's top corner. */
const spriteBounds: Record<Kind, Box> = {
  cat: { minX: -50, minY: -24, width: 100, height: 68 },
  dog: { minX: -52, minY: -28, width: 104, height: 74 },
  cow: { minX: -42, minY: -24, width: 84, height: 70 },
  chicken: { minX: -18, minY: 0, width: 36, height: 39 },
  pond: { minX: -145, minY: -2, width: 290, height: 146 },
  house: { minX: -108, minY: -112, width: 216, height: 220 },
  barn: { minX: -108, minY: -106, width: 216, height: 214 },
  fence: { minX: -52, minY: -36, width: 104, height: 92 },
  tree: { minX: -52, minY: -92, width: 104, height: 136 },
  bush: { minX: -52, minY: -20, width: 104, height: 62 },
  bed: { minX: -58, minY: -108, width: 116, height: 166 },
};

/** Where a thing's drawing stands in the scene; things nearer the viewer are drawn over those behind. */
export function spriteBox(kind: Kind, x: number, y: number) {
  const b = spriteBounds[kind];
  const sx = SCENE.width / 2 + ((x - y) * TILE_W) / 2;
  const sy = TOP + ((x + y) * TILE_H) / 2;
  return { left: sx + b.minX, top: sy + b.minY, width: b.width, height: b.height, zIndex: (x + y + 2 * footprint(kind)) * 10 };
}

export const viewBoxOf = (kind: Kind) => {
  const b = spriteBounds[kind];
  return `${b.minX} ${b.minY} ${b.width} ${b.height}`;
};

/** The scene's view: its zoom and where its top-left corner sits in the viewport. */
export type View = { z: number; x: number; y: number };
/** The zoom's limits and a button's step (a factor). */
export const ZOOM = { min: 0.2, max: 1.6, step: 1.25 };
export const clampZoom = (z: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));

/** The view moved just enough to show a point with a margin, clear of whatever covers the viewport's bottom. */
export function showing(view: View, size: { w: number; h: number; bottom: number }, centre: { x: number; y: number }): View {
  const { w, h, bottom } = size;
  if (!w || !h) return view;
  const sx = view.x + centre.x * view.z;
  const sy = view.y + centre.y * view.z;
  const margin = Math.min(64, w / 4, h / 4);
  /** What is left of the viewport above what covers its bottom. */
  const room = h - bottom;
  // The lowest a point may sit: a margin above what covers the bottom; in the middle of a band too low for the margins; anywhere when hardly a band is left.
  const low = room - margin > margin ? room - margin : room > margin ? room / 2 : h - margin;
  const high = Math.min(margin, low);
  const dx = sx < margin ? margin - sx : sx > w - margin ? w - margin - sx : 0;
  const dy = sy < high ? high - sy : sy > low ? low - sy : 0;
  return dx || dy ? { ...view, x: view.x + dx, y: view.y + dy } : view;
}

/** The view zoomed to `z`, keeping the scene point under (px, py) where it is. */
export function zoomedAt(view: View, z: number, px: number, py: number): View {
  const next = clampZoom(z);
  const k = next / view.z;
  return { z: next, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** The view held over the ground: the viewport's centre never leaves the ground's box, so the ground cannot be lost. */
export function held(view: View, w: number, h: number): View {
  if (!w || !h) return view;
  const x = Math.min(w / 2 - SIDE * view.z, Math.max(w / 2 - (SCENE.width - SIDE) * view.z, view.x));
  const y = Math.min(h / 2 - TOP * view.z, Math.max(h / 2 - (TOP + GROUND * TILE_H) * view.z, view.y));
  return x === view.x && y === view.y ? view : { ...view, x, y };
}

/** Whether the whole scene is inside the viewport: then there is nowhere to pan to. */
export const allInView = (view: View, w: number, h: number) => view.x >= 0 && view.y >= 0 && view.x + SCENE.width * view.z <= w && view.y + SCENE.height * view.z <= h;

/** How far a point's shadow falls along the ground for each unit of its height, in tiles: the light comes from the left. */
const SUN: [number, number] = [0.0075, -0.003];
/** Where the shadow of a point falls, in a drawing's own space. */
export const shadowPt = (x: number, y: number, z: number): [number, number] => pt(x + SUN[0] * z, y + SUN[1] * z, 0);

/** The convex outline round a set of points, as an SVG points list. */
export function hull(points: [number, number][]): string {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half(sorted.reverse())].map((p) => `${+p[0].toFixed(1)} ${+p[1].toFixed(1)}`).join(" ");
}

/** The shadow a solid casts on the ground, from its corners (x, y, z): the outline round where each of them falls. */
export const shadowOf = (corners: [number, number, number][]) => hull(corners.map((c) => shadowPt(...c)));

/** A fixed number from 0 up to 1 for a pair of whole numbers: the same tile always gets the same tuft. */
export function scatter(a: number, b: number): number {
  let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x79b9, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
