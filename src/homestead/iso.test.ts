import { describe, expect, it } from "vitest";
import { clampZoom, SCENE, showing, spriteBox, tileBox, tileCentre, ZOOM, zoomedAt } from "./iso";

describe("the projection", () => {
  it("puts the ground's top corner in the middle and its side corners at the edges", () => {
    expect(tileCentre(0, 0).x).toBe(SCENE.width / 2);
    expect(tileBox(9, 0).left + tileBox(9, 0).width).toBe(SCENE.width);
    expect(tileBox(0, 9).left).toBe(0);
    expect(tileBox(9, 9).top + tileBox(9, 9).height).toBeLessThanOrEqual(SCENE.height);
  });

  it("draws a thing nearer the viewer over one behind it", () => {
    expect(spriteBox("bed", 3, 4).zIndex).toBeGreaterThan(spriteBox("bed", 3, 3).zIndex);
    // A house is as near as its front tile: over the fence behind it, under the bush in front.
    expect(spriteBox("house", 1, 1).zIndex).toBeGreaterThan(spriteBox("fence", 2, 0).zIndex);
    expect(spriteBox("bush", 3, 3).zIndex).toBeGreaterThan(spriteBox("house", 1, 1).zIndex);
  });
});

describe("the view", () => {
  it("keeps the zoom inside its limits", () => {
    expect(clampZoom(10)).toBe(ZOOM.max);
    expect(clampZoom(0)).toBe(ZOOM.min);
  });

  it("zooms about a point without moving it", () => {
    const view = zoomedAt({ z: 1, x: 10, y: 20 }, 1.25, 100, 50);
    // The scene point that was under (100, 50) is still there.
    expect(view.x + 90 * view.z).toBeCloseTo(100);
    expect(view.y + 30 * view.z).toBeCloseTo(50);
  });

  it("moves only as far as it takes to show a point, clear of what covers the bottom", () => {
    const view = { z: 1, x: 0, y: 0 };
    const size = { w: 400, h: 300, bottom: 0 };
    expect(showing(view, size, { x: 200, y: 150 })).toBe(view);
    expect(showing(view, size, { x: 500, y: 150 })).toEqual({ z: 1, x: -164, y: 0 });
    expect(showing(view, { ...size, bottom: 120 }, { x: 200, y: 250 })).toEqual({ z: 1, x: 0, y: -134 });
    expect(showing(view, { w: 0, h: 0, bottom: 0 }, { x: 500, y: 500 })).toBe(view);
  });
});
