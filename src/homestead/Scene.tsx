// The scene's viewport and its camera. A drag with a mouse or one finger
// pans; the wheel or two fingers zoom around the pointer; a drag that starts
// on the selected thing carries it to another place. The ground cannot be
// dragged out of sight. The scene is one grid with one Tab stop: arrow keys
// move the highlighted tile, Enter or Space selects it or uses the tool in
// hand, Escape cancels, + and − zoom, 0 shows the whole ground and R turns a
// fence. Buttons over the scene zoom, fit and pan, so nothing needs a drag, a
// pinch or a hover; the arrows show only while part of the scene is out of
// view. A view asked for by a button or a key glides into place; one made by
// a drag, the wheel or a pinch follows the hand at once. The highlighted tile
// is brought into view after a key, never after a tap or a hover, which act on
// what is already in view. Whatever is passed as children (the tool's line, a
// thing's card, the seed chooser) floats over the scene's bottom on a wide
// page and sits under it on a narrow one.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { CloudRain, Sun, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Maximize, Minus, Plus, type LucideIcon } from "lucide-react";
import { weatherAt } from "./weather";
import { Shower } from "./Shower";
import { w } from "./strings";
import { allInView, clampZoom, groundAt, held, SCENE, showing, TILE_W, tileCentre, ZOOM, zoomedAt, type View } from "./iso";
import { IsoScene, tileId, type Burst, type Ghost } from "./IsoScene";
import { footprint, GROUND, thingAt, type Homestead, type Thing, type Tile } from "./rules";
import { moveCursor, type Mark } from "./screen";

export const SCENE_ID = "homestead-scene";
/** How far a pointer travels before a press becomes a drag, in px. */
const DRAG_SLOP = 5;
/** The narrowest a tile may be drawn on the first view, so a finger can take it. */
const TAP = 44;

/** A view the scene makes by itself: the first one, or the whole ground. It is made again when the viewport changes size. */
type Framing = "entry" | "fit";
/** The view as it was left, kept while the page is open: coming back from a lesson shows the same corner of the ground. */
let kept: { view: View; framing: Framing | null } | null = null;

type Props = {
  home: Homestead;
  cursor: Tile;
  marks: Map<string, Mark>;
  ghost: Ghost | null;
  fits: boolean | null;
  selected: Tile | null;
  burst: Burst | null;
  onCursor: (tile: Tile) => void;
  onActivate: (tile: Tile) => void;
  /** The selected thing was picked up by a drag: it is now being moved. */
  onCarry: (thing: Thing) => void;
  /** R was pressed: a fence in hand, or the selected one, turns. */
  onRotate: () => void;
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

/** How a view is shown: remembered for the next visit, and gliding into place or set at once. */
type Shown = { keep?: boolean; glide?: boolean };

function useView(start: Tile) {
  const viewport = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(kept?.view ?? { z: 1, x: 0, y: 0 });
  const [glide, setGlide] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The view as last set, for two changes in one commit: the first fit, then the cursor brought into view.
  const current = useRef(view);
  /** Which of its own views the scene is showing, or null once it was changed by hand. */
  const framing = useRef<Framing | null>(kept?.framing ?? null);
  /** Shows a view, held over the ground; `keep` also remembers it, which a drag does once, when it ends. */
  const show = useCallback((next: View, { keep = true, glide: gliding = false }: Shown = {}) => {
    const el = viewport.current;
    const view = el ? held(next, el.clientWidth, el.clientHeight) : next;
    current.current = view;
    framing.current = null;
    setView(view);
    setGlide(gliding);
    if (keep) kept = { view, framing: null };
  }, []);
  const first = useRef(start);
  /** Shows one of the scene's own views. */
  const frame = useCallback(
    (how: Framing, glide = false) => {
      const el = viewport.current;
      if (!el) return;
      show(how === "fit" ? fitted(el) : entry(el, first.current), { glide });
      framing.current = how;
      kept = { view: current.current, framing: how };
    },
    [show],
  );
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let seen = { w: el.clientWidth, h: el.clientHeight };
    setSize(seen);
    if (!kept) frame("entry");
    if (typeof ResizeObserver === "undefined") return;
    // A viewport that changed size keeps the scene's own view fitted to it, and any other view over the ground.
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === seen.w && el.clientHeight === seen.h) return;
      seen = { w: el.clientWidth, h: el.clientHeight };
      setSize(seen);
      if (framing.current) frame(framing.current);
      else show(current.current);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [show, frame]);
  const zoomAt = useCallback(
    (to: (z: number) => number, px?: number, py?: number, shown?: Shown) => {
      const el = viewport.current;
      if (!el) return;
      const v = current.current;
      show(zoomedAt(v, to(v.z), px ?? el.clientWidth / 2, py ?? el.clientHeight / 2), shown);
    },
    [show],
  );
  /** Moves the view by a third of the viewport. */
  const pan = (dx: number, dy: number) => {
    const el = viewport.current;
    if (el) show({ ...current.current, x: current.current.x + (dx * el.clientWidth) / 3, y: current.current.y + (dy * el.clientHeight) / 3 }, { glide: true });
  };
  const reveal = useCallback(
    (tile: Tile) => {
      const el = viewport.current;
      if (!el) return;
      const next = showing(current.current, { w: el.clientWidth, h: el.clientHeight, bottom: coveredBy(overlay.current, el) }, tileCentre(tile[0], tile[1]));
      if (next !== current.current) show(next, { glide: true });
    },
    [show],
  );
  return { viewport, overlay, view, glide, size, current, show, frame, zoomAt, pan, reveal };
}

/** A thing carried by a drag: where it stood, where on the ground it was taken hold of, and the tile it is over now. */
type Carried = { thing: Thing; dx: number; dy: number; tile: Tile };
type Drag = { x: number; y: number; vx: number; vy: number; moved: boolean; carried: Carried | null };

/** What a drag that starts on the selected thing does with it. */
type Carrying = {
  /** The thing that can be picked up now, if any. */
  thing: Thing | undefined;
  start: (thing: Thing) => void;
  over: (tile: Tile) => void;
  drop: (tile: Tile) => void;
  cancel: () => void;
};

/**
 * Drag to pan, wheel and pinch to zoom at the pointer; a drag that starts on
 * the selected thing carries it instead, and puts it down where it ends. A
 * press that became a drag swallows its click.
 */
function useCamera({ viewport, current, show, zoomAt }: ReturnType<typeof useView>, carrying: Carrying) {
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
      zoomAt((z) => z * Math.exp(-delta * 0.0012), e.clientX - r.left, e.clientY - r.top, { keep: false });
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

  /** The ground point under a pointer. */
  const groundUnder = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const v = current.current;
    return groundAt((e.clientX - r.left - el.clientLeft - v.x) / v.z, (e.clientY - r.top - el.clientTop - v.y) / v.z);
  };
  /** The selected thing, when the press is on its drawing: taken hold of at the ground point under the pointer. */
  const grabbed = (e: PointerEvent<HTMLDivElement>): Carried | null => {
    const thing = carrying.thing;
    if (!thing || !(e.target instanceof Element) || !e.target.closest(".homestead-thing.is-selected")) return null;
    const [gx, gy] = groundUnder(e);
    return { thing, dx: gx - thing.x, dy: gy - thing.y, tile: [thing.x, thing.y] };
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    swallow.current = false;
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, vx: current.current.x, vy: current.current.y, moved: false, carried: grabbed(e) };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: current.current.z };
      // A second finger ends a carry where it began.
      if (drag.current?.carried && drag.current.moved) carrying.cancel();
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
      zoomAt(() => target, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, { keep: false });
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
      if (d.carried) carrying.start(d.carried.thing);
    }
    if (d.carried) {
      // The thing follows the pointer by the point it was taken hold of, and stays on the ground.
      const [gx, gy] = groundUnder(e);
      const last = GROUND - footprint(d.carried.thing.kind);
      const onGround = (n: number) => Math.min(last, Math.max(0, Math.round(n)));
      const tile: Tile = [onGround(gx - d.carried.dx), onGround(gy - d.carried.dy)];
      if (tile[0] !== d.carried.tile[0] || tile[1] !== d.carried.tile[1]) carrying.over(tile);
      d.carried.tile = tile;
      return;
    }
    show({ ...current.current, x: d.vx + dx, y: d.vy + dy }, { keep: false });
    changed.current = true;
  };
  const end = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const d = drag.current;
    if (d?.moved) swallow.current = true;
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size > 0) return;
    drag.current = null;
    if (d?.carried && d.moved) {
      if (cancelled) carrying.cancel();
      else carrying.drop(d.carried.tile);
    }
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
  return { down, move, up: (e: PointerEvent<HTMLDivElement>) => end(e, false), cancel: (e: PointerEvent<HTMLDivElement>) => end(e, true), click };
}

/** A button over the scene: an icon, with its words as the name and the tooltip. One that can do nothing more stays in the Tab order. */
function Round({ id, label, icon: Icon, onClick, spent = false }: { id: string; label: string; icon: LucideIcon; onClick: () => void; spent?: boolean }) {
  return (
    <button type="button" id={id} className="homestead-round" aria-label={label} title={label} aria-disabled={spent || undefined} onClick={spent ? undefined : onClick}>
      <Icon aria-hidden="true" focusable="false" className="homestead-round-icon" />
    </button>
  );
}

const plain = (event: KeyboardEvent) => !event.ctrlKey && !event.metaKey && !event.altKey;

export function Scene({ home, cursor, marks, ghost, fits, selected, burst, onCursor, onActivate, onCarry, onRotate, onEscape, children }: Props) {
  const [weather, setWeather] = useState(() => weatherAt(Date.now()));
  useEffect(() => {
    const refresh = () => setWeather(weatherAt(Date.now()));
    const timer = window.setTimeout(refresh, Math.max(0, weather.next - Date.now()));
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [weather.next]);
  const cam = useView(cursor);
  const { viewport, overlay, view, glide, size, frame, zoomAt, pan, reveal } = cam;
  // Whether the cursor was last moved by a pointer: then the view stays where it was put.
  const pointed = useRef(false);
  const pointer = useCamera(cam, {
    // Only the thing whose card is open can be picked up: with a tool in hand a drag pans.
    thing: selected && !ghost && marks.get(`${selected[0]},${selected[1]}`) === "selected" ? thingAt(home, selected[0], selected[1]) : undefined,
    // At once, so the drag's next move already finds the thing in hand.
    start: (thing) => flushSync(() => onCarry(thing)),
    over: (tile) => {
      pointed.current = true;
      onCursor(tile);
    },
    drop: (tile) => {
      pointed.current = true;
      onActivate(tile);
    },
    cancel: onEscape,
  });
  useEffect(() => {
    if (!pointed.current) reveal(cursor);
  }, [cursor, reveal]);
  useEffect(() => {
    if (selected && !pointed.current) reveal(selected);
  }, [selected, reveal]);
  const closer = () => zoomAt((z) => z * ZOOM.step, undefined, undefined, { glide: true });
  const farther = () => zoomAt((z) => z / ZOOM.step, undefined, undefined, { glide: true });
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = moveCursor(cursor, event.key);
    if (next) {
      pointed.current = false;
      onCursor(next);
    } else if (event.key === "Enter" || event.key === " ") {
      pointed.current = false;
      onActivate(cursor);
    } else if (event.key === "Escape") onEscape();
    else if (!plain(event)) return;
    else if (event.key === "+" || event.key === "=") closer();
    else if (event.key === "-" || event.key === "_") farther();
    else if (event.key === "0") frame("fit", true);
    // By the key's place, so it is the same key on a Russian layout.
    else if (event.code === "KeyR") onRotate();
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
            data-rain={weather.rain || undefined}
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
            onPointerCancel={pointer.cancel}
            onClickCapture={pointer.click}
          >
            <div className="homestead-sky" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className={`homestead-world${glide ? " is-gliding" : ""}`} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
              <IsoScene rain={weather.rain} home={home} cursor={cursor} marks={marks} ghost={ghost} fits={fits} burst={burst} onTile={tap} onHover={hover} />
            </div>
            {weather.rain && <Shower start={weather.start} end={weather.end} />}
          </div>
          <div className="homestead-weather">
            {weather.rain ? <CloudRain aria-hidden="true" /> : <Sun aria-hidden="true" />}
            {weather.rain ? w.weather.rain : w.weather.sunny}
          </div>
          <div className="homestead-zoom" role="group" aria-label={w.zoom.label}>
            <Round id="homestead-zoom-in" label={w.zoom.in} icon={Plus} onClick={closer} spent={view.z >= ZOOM.max} />
            <Round id="homestead-zoom-out" label={w.zoom.out} icon={Minus} onClick={farther} spent={view.z <= ZOOM.min} />
            <Round id="homestead-fit" label={w.zoom.all} icon={Maximize} onClick={() => frame("fit", true)} />
          </div>
          {/* With the whole scene in view there is nowhere to pan to: the arrows leave, unless one of them has focus. */}
          <div className="homestead-pan" role="group" aria-label={w.zoom.pan} data-idle={allInView(view, size.w, size.h) || undefined}>
            <Round id="homestead-pan-up" label={w.zoom.up} icon={ChevronUp} onClick={() => pan(0, 1)} />
            <Round id="homestead-pan-left" label={w.zoom.left} icon={ChevronLeft} onClick={() => pan(1, 0)} />
            <Round id="homestead-pan-right" label={w.zoom.right} icon={ChevronRight} onClick={() => pan(-1, 0)} />
            <Round id="homestead-pan-down" label={w.zoom.down} icon={ChevronDown} onClick={() => pan(0, -1)} />
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
