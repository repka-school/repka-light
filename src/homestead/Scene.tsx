// The scene's viewport and its camera. A drag with a mouse or one finger
// pans; the wheel or two fingers zoom around the pointer. The scene is one
// grid with one Tab stop: arrow keys move the highlighted tile, Enter or
// Space selects it or uses the tool in hand, Escape cancels. Round buttons
// over the scene zoom, fit and pan, so nothing needs a drag, a pinch or a
// hover. The highlighted tile is brought into view after a key, never after
// a tap or a hover, which act on what is already in view. Whatever is passed
// as children (the tool's line, a thing's card, the seed chooser) floats over
// the scene's bottom on a wide page and sits under it on a narrow one.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, RotateCcw, type LucideIcon } from "lucide-react";
import { w } from "./strings";
import { clampZoom, SCENE, showing, TILE_W, tileCentre, ZOOM, zoomedAt, type View } from "./iso";
import { IsoScene, tileId, type Ghost } from "./IsoScene";
import { GROUND, type Homestead, type Tile } from "./rules";
import { moveCursor, type Mark } from "./screen";

export const SCENE_ID = "homestead-scene";
/** How far a pointer travels before a press becomes a drag, in px. */
const DRAG_SLOP = 5;
/** The narrowest a tile may be drawn on the first view, so a finger can take it. */
const TAP = 44;

/** The view as it was left, kept while the page is open: coming back from a lesson shows the same corner of the ground. */
let kept: View | null = null;

type Props = {
  home: Homestead;
  cursor: Tile;
  marks: Map<string, Mark>;
  ghost: Ghost | null;
  fits: boolean | null;
  selected: Tile | null;
  onCursor: (tile: Tile) => void;
  onActivate: (tile: Tile) => void;
  onEscape: () => void;
  children?: ReactNode;
};

/** The view that shows the whole ground. */
function fitted(el: HTMLElement): View {
  const z = clampZoom(Math.min((el.clientWidth - 16) / SCENE.width, (el.clientHeight - 16) / SCENE.height) || ZOOM.min);
  return { z, x: (el.clientWidth - SCENE.width * z) / 2, y: Math.max(8, (el.clientHeight - SCENE.height * z) / 2) };
}

/** The first view: the whole ground when its tiles are wide enough to tap, otherwise zoomed until they are, centred on a tile. */
function entry(el: HTMLElement, tile: Tile): View {
  const whole = fitted(el);
  if (whole.z * TILE_W >= TAP) return whole;
  const z = clampZoom((TAP + 1) / TILE_W);
  const c = tileCentre(tile[0], tile[1]);
  return { z, x: el.clientWidth / 2 - c.x * z, y: el.clientHeight / 2 - c.y * z };
}

/** How much of the viewport's bottom the overlay covers: nothing when it sits under the scene. */
function coveredBy(overlay: HTMLElement | null, viewport: HTMLElement) {
  if (!overlay) return 0;
  const o = overlay.getBoundingClientRect();
  const v = viewport.getBoundingClientRect();
  return o.height > 0 && o.top < v.bottom ? v.bottom - o.top : 0;
}

function useView(start: Tile) {
  const viewport = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(kept ?? { z: 1, x: 0, y: 0 });
  // The view as last set, for two changes in one commit: the first fit, then the cursor brought into view.
  const current = useRef(view);
  /** Shows a view; `keep` also remembers it, which a drag does once, when it ends. */
  const show = useCallback((next: View, keep = true) => {
    current.current = next;
    setView(next);
    if (keep) kept = next;
  }, []);
  const fit = useCallback(() => {
    if (viewport.current) show(fitted(viewport.current));
  }, [show]);
  const first = useRef(start);
  useLayoutEffect(() => {
    if (!kept && viewport.current) show(entry(viewport.current, first.current));
  }, [show]);
  const zoomAt = useCallback(
    (to: (z: number) => number, px?: number, py?: number, keep = true) => {
      const el = viewport.current;
      if (!el) return;
      const v = current.current;
      show(zoomedAt(v, to(v.z), px ?? el.clientWidth / 2, py ?? el.clientHeight / 2), keep);
    },
    [show],
  );
  /** Moves the view by a third of the viewport. */
  const pan = (dx: number, dy: number) => {
    const el = viewport.current;
    if (el) show({ ...current.current, x: current.current.x + (dx * el.clientWidth) / 3, y: current.current.y + (dy * el.clientHeight) / 3 });
  };
  const reveal = useCallback(
    (tile: Tile) => {
      const el = viewport.current;
      if (!el) return;
      const next = showing(current.current, { w: el.clientWidth, h: el.clientHeight, bottom: coveredBy(overlay.current, el) }, tileCentre(tile[0], tile[1]));
      if (next !== current.current) show(next);
    },
    [show],
  );
  return { viewport, overlay, view, current, show, fit, zoomAt, pan, reveal };
}

type Drag = { x: number; y: number; vx: number; vy: number; moved: boolean };

/** Drag to pan, wheel and pinch to zoom at the pointer. A press that became a drag swallows its click. */
function useCamera({ viewport, current, show, zoomAt }: ReturnType<typeof useView>) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<Drag | null>(null);
  const pinch = useRef<{ dist: number; z: number } | null>(null);
  const swallow = useRef(false);
  /** The view moved under a drag or a pinch since the first finger went down; remembered once the last one lifts. */
  const changed = useRef(false);
  const wheelDone = useRef(0);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    // Not a React handler: the wheel must not scroll the page, and React's wheel listener is passive.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt((z) => z * Math.exp(-delta * 0.0012), e.clientX - r.left, e.clientY - r.top, false);
      // Remembered once the wheel stops, not at every notch.
      cancelAnimationFrame(wheelDone.current);
      wheelDone.current = requestAnimationFrame(() => show(current.current));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(wheelDone.current);
    };
  }, [viewport, zoomAt, show, current]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    swallow.current = false;
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, vx: current.current.x, vy: current.current.y, moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: current.current.z };
      drag.current = null;
      swallow.current = true;
    }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = e.currentTarget.getBoundingClientRect();
      const target = (pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist;
      zoomAt(() => target, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, false);
      changed.current = true;
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
    if (!d.moved) {
      d.moved = true;
      // Captured only once it is a drag, so a tap still lands on its tile.
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    show({ ...current.current, x: d.vx + dx, y: d.vy + dy }, false);
    changed.current = true;
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (drag.current?.moved) swallow.current = true;
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size > 0) return;
    drag.current = null;
    if (changed.current) show(current.current);
    changed.current = false;
  };
  /** A drag or a pinch ends without selecting, planting or placing what it ended on. */
  const click = (e: MouseEvent) => {
    if (!swallow.current) return;
    swallow.current = false;
    e.stopPropagation();
    e.preventDefault();
  };
  return { down, move, up, click };
}

/** A round button over the scene: an icon, with its words as the name and the tooltip. */
function Round({ id, label, icon: Icon, onClick }: { id: string; label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" id={id} className="homestead-round" aria-label={label} title={label} onClick={onClick}>
      <Icon aria-hidden="true" focusable="false" className="homestead-round-icon" />
    </button>
  );
}

export function Scene({ home, cursor, marks, ghost, fits, selected, onCursor, onActivate, onEscape, children }: Props) {
  const cam = useView(cursor);
  const { viewport, overlay, view, fit, zoomAt, pan, reveal } = cam;
  const pointer = useCamera(cam);
  // Whether the cursor was last moved by a pointer: then the view stays where it was put.
  const pointed = useRef(false);
  useEffect(() => {
    if (!pointed.current) reveal(cursor);
  }, [cursor, reveal]);
  useEffect(() => {
    if (selected && !pointed.current) reveal(selected);
  }, [selected, reveal]);
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = moveCursor(cursor, event.key);
    if (next) {
      pointed.current = false;
      onCursor(next);
    } else if (event.key === "Enter" || event.key === " ") {
      pointed.current = false;
      onActivate(cursor);
    } else if (event.key === "Escape") onEscape();
    else return;
    event.preventDefault();
  };
  const hover = (tile: Tile) => {
    pointed.current = true;
    if (tile[0] !== cursor[0] || tile[1] !== cursor[1]) onCursor(tile);
  };
  const tap = (tile: Tile) => {
    pointed.current = true;
    onCursor(tile);
    onActivate(tile);
  };
  return (
    <div className="homestead-stage">
      {/* The stage measures the width; this inner box lays itself out by it. */}
      <div className="homestead-stage-scene">
      <div className="homestead-frame">
        <div
          ref={viewport}
          id={SCENE_ID}
          className="homestead-viewport"
          role="grid"
          tabIndex={0}
          aria-label={w.scene.label}
          aria-describedby="homestead-scene-keys"
          aria-activedescendant={tileId(cursor)}
          aria-rowcount={GROUND}
          aria-colcount={GROUND}
          onKeyDown={keys}
          onPointerDown={pointer.down}
          onPointerMove={pointer.move}
          onPointerUp={pointer.up}
          onPointerCancel={pointer.up}
          onClickCapture={pointer.click}
        >
          <div className="homestead-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
            <IsoScene home={home} cursor={cursor} marks={marks} ghost={ghost} fits={fits} onTile={tap} onHover={hover} />
          </div>
        </div>
        <div className="homestead-zoom" role="group" aria-label={w.zoom.label}>
          <Round id="homestead-zoom-in" label={w.zoom.in} icon={Plus} onClick={() => zoomAt((z) => z * ZOOM.step)} />
          <Round id="homestead-zoom-out" label={w.zoom.out} icon={Minus} onClick={() => zoomAt((z) => z / ZOOM.step)} />
          <Round id="homestead-fit" label={w.zoom.all} icon={RotateCcw} onClick={fit} />
        </div>
        <div className="homestead-pan" role="group" aria-label={w.zoom.pan}>
          <Round id="homestead-pan-up" label={w.zoom.up} icon={ArrowUp} onClick={() => pan(0, 1)} />
          <Round id="homestead-pan-left" label={w.zoom.left} icon={ArrowLeft} onClick={() => pan(1, 0)} />
          <Round id="homestead-pan-right" label={w.zoom.right} icon={ArrowRight} onClick={() => pan(-1, 0)} />
          <Round id="homestead-pan-down" label={w.zoom.down} icon={ArrowDown} onClick={() => pan(0, -1)} />
        </div>
      </div>
      <p className="homestead-scene-hint">{w.scene.hint}</p>
      {/* The grid's description; shown in place of the drag hint while the scene has keyboard focus. */}
      <p id="homestead-scene-keys" className="homestead-scene-keys">
        {w.scene.keys}
      </p>
      <div ref={overlay} className="homestead-overlay">
        {children}
      </div>
      </div>
    </div>
  );
}
