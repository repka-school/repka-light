import { describe, expect, it } from "vitest";
import { allInView, clampZoom, groundAt, held, hull, scatter, SCENE, scenePt, shadowOf, showing, spriteBox, tileBox, tileCentre, ZOOM, zoomedAt } from "./iso";
import { GROUND } from "./rules";

const last = GROUND - 1;

describe("the projection", () => {
  it("puts the ground's top corner in the middle and leaves the same room beside both side corners", () => {
    expect(tileCentre(0, 0).x).toBe(SCENE.width / 2);
    const right = SCENE.width - (tileBox(last, 0).left + tileBox(last, 0).width);
    expect(tileBox(0, last).left).toBe(right);
    expect(right).toBeGreaterThan(0);
    expect(tileBox(last, last).top + tileBox(last, last).height).toBeLessThan(SCENE.height);
  });

  it("finds the ground point under a scene point", () => {
    const [sx, sy] = scenePt(3.25, 6.5);
    const [x, y] = groundAt(sx, sy);
    expect(x).toBeCloseTo(3.25);
    expect(y).toBeCloseTo(6.5);
    const centre = tileCentre(4, 2);
    expect(groundAt(centre.x, centre.y).map(Math.floor)).toEqual([4, 2]);
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

  it("holds the view over the ground, and leaves a view that is over it alone", () => {
    const centred = { z: 1, x: 200 - SCENE.width / 2, y: 0 };
    expect(held(centred, 400, 300)).toBe(centred);
    // Dragged far to the right: the ground's left corner stops at the viewport's centre.
    expect(held({ z: 1, x: 5000, y: 0 }, 400, 300).x).toBe(200 - tileBox(0, last).left);
    expect(held({ z: 1, x: -5000, y: 0 }, 400, 300).x).toBe(200 - (tileBox(last, 0).left + tileBox(last, 0).width));
    const low = held({ z: 0.5, x: centred.x, y: 5000 }, 400, 300);
    expect(low.y).toBe(150 - tileBox(0, 0).top * 0.5);
    expect(held({ z: 1, x: 5000, y: 5000 }, 0, 0)).toEqual({ z: 1, x: 5000, y: 5000 });
  });

  it("knows when the whole scene is in view", () => {
    expect(allInView({ z: 0.25, x: 10, y: 10 }, SCENE.width, SCENE.height)).toBe(true);
    expect(allInView({ z: 0.25, x: -1, y: 10 }, SCENE.width, SCENE.height)).toBe(false);
    expect(allInView({ z: 1, x: 0, y: 0 }, SCENE.width - 1, SCENE.height)).toBe(false);
  });

  it("moves only as far as it takes to show a point, clear of what covers the bottom", () => {
    const view = { z: 1, x: 0, y: 0 };
    const size = { w: 400, h: 300, bottom: 0 };
    expect(showing(view, size, { x: 200, y: 150 })).toBe(view);
    expect(showing(view, size, { x: 500, y: 150 })).toEqual({ z: 1, x: -164, y: 0 });
    expect(showing(view, { ...size, bottom: 120 }, { x: 200, y: 250 })).toEqual({ z: 1, x: 0, y: -134 });
    expect(showing(view, { w: 0, h: 0, bottom: 0 }, { x: 500, y: 500 })).toBe(view);
  });

  it("shows a point in the middle of a narrow band left above what covers the bottom", () => {
    const view = { z: 1, x: 0, y: 0 };
    // 100 of 300 is left: too low for a margin above and under the point.
    expect(showing(view, { w: 400, h: 300, bottom: 200 }, { x: 200, y: 250 })).toEqual({ z: 1, x: 0, y: -200 });
    expect(showing(view, { w: 400, h: 300, bottom: 200 }, { x: 200, y: 50 })).toBe(view);
    // Hardly anything is left: the cover is not counted.
    expect(showing(view, { w: 400, h: 300, bottom: 280 }, { x: 200, y: 250 })).toEqual({ z: 1, x: 0, y: -14 });
  });
});

describe("shadows and scatter", () => {
  it("draws the outline round a set of points, leaving out those inside", () => {
    expect(hull([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2], [1, 3]]).split(" ").length).toBe(8);
  });

  it("casts a shadow that holds the foot of the solid and leans away from the light", () => {
    const flatOnGround = shadowOf([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]);
    const tall = shadowOf([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 50], [1, 0, 50], [1, 1, 50], [0, 1, 50]]);
    const xs = (points: string) => points.split(" ").filter((_, i) => i % 2 === 0).map(Number);
    expect(Math.min(...xs(tall))).toBe(Math.min(...xs(flatOnGround)));
    expect(Math.max(...xs(tall))).toBeGreaterThan(Math.max(...xs(flatOnGround)));
  });

  it("gives a tile the same number every time, between 0 and 1", () => {
    expect(scatter(3, 7)).toBe(scatter(3, 7));
    expect(scatter(3, 7)).not.toBe(scatter(7, 3));
    for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) expect(scatter(x, y)).toBeGreaterThanOrEqual(0), expect(scatter(x, y)).toBeLessThan(1);
  });
});
