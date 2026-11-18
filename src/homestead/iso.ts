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

/** The whole scene's size. */
export const SCENE = { width: GROUND * TILE_W, height: GROUND * TILE_H + TOP + TILE_H };

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
  house: { minX: -108, minY: -104, width: 216, height: 212 },
  barn: { minX: -108, minY: -106, width: 216, height: 214 },
  fence: { minX: -52, minY: -34, width: 104, height: 90 },
  tree: { minX: -52, minY: -74, width: 104, height: 118 },
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
export const ZOOM = { min: 0.25, max: 1.6, step: 1.25 };
export const clampZoom = (z: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));

/** The view moved just enough to show a point with a margin, clear of whatever covers the viewport's bottom. */
export function showing(view: View, size: { w: number; h: number; bottom: number }, centre: { x: number; y: number }): View {
  const { w, h, bottom } = size;
  if (!w || !h) return view;
  const sx = view.x + centre.x * view.z;
  const sy = view.y + centre.y * view.z;
  const margin = Math.min(64, w / 4, h / 4);
  // The lowest a point may sit: above what covers the bottom, unless that leaves no room at all.
  const low = h - bottom - margin > margin ? h - bottom - margin : h - margin;
  const dx = sx < margin ? margin - sx : sx > w - margin ? w - margin - sx : 0;
  const dy = sy < margin ? margin - sy : sy > low ? low - sy : 0;
  return dx || dy ? { ...view, x: view.x + dx, y: view.y + dy } : view;
}

/** The view zoomed to `z`, keeping the scene point under (px, py) where it is. */
export function zoomedAt(view: View, z: number, px: number, py: number): View {
  const next = clampZoom(z);
  const k = next / view.z;
  return { z: next, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}
