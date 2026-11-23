import { useRef, useState } from "react";
import { Link } from "react-router";
import { announce } from "@/ui/components/Announcer";
import { PageHeading } from "@/ui/components/PageHeading";
import { Button } from "@/ui/components/ui/button";
import { useFocusAfter } from "@/ui/hooks/useFocusAfter";
import { Page } from "@/components/Chrome";
import { CHOOSER_CHIP_ID, HarvestShelf, Tray } from "@/homestead/Panels";
import { apply, dayOf, heldSeeds, seedTotal, targetOf, thingAt, type Action, type Homestead, type Quality, type Thing, type Tile } from "@/homestead/rules";
import type { Burst } from "@/homestead/IsoScene";
import { Scene, SCENE_ID } from "@/homestead/Scene";
import { afterOutcome, firstTile, fitsHere, intentAt, marksOf, modeLasts, startTile, type Mode } from "@/homestead/screen";
import { CHOOSER_TITLE_ID, SeedChooser } from "@/homestead/SeedChooser";
import { Paints } from "@/homestead/shapes";
import { CARD_SEEDS_ID, PLANT_ID, ThingCard } from "@/homestead/ThingCard";
import { modeLine, saidWords } from "@/homestead/words";
import { freeXpOf, getSaved, homesteadOf, saveHomestead, useSaved } from "@/store/store";
import { totalXp } from "@/store/xp";
import { w } from "@/homestead/strings";
import "@/homestead/homestead.css";

/** «Выбрать семечко» on the line shown while there is nothing to plant; focus returns to it when the chooser closes, if it is still there. */
const PICK_ID = "homestead-pick";

/**
 * The homestead: a ground to arrange, a tray of tools under it, a card for
 * whatever is selected, and the harvest. The tray says what is held; the card
 * does everything its thing can have done to it. Every change is saved as it
 * is made.
 */
export default function HomesteadScreen() {
  const saved = useSaved();
  return (
    <Page focusKey="homestead" className="homestead-page">
      <section className="homestead-shell">
        <PageHeading>{w.title}</PageHeading>
        <Loaded home={homesteadOf(saved)} free={freeXpOf(saved)} />
        <Link to="/courses" className="homestead-back">
          {w.toCourses}
        </Link>
      </section>
    </Page>
  );
}

/** The lines above the scene: nothing to plant and nothing growing, with the way to the seeds; and no experience left to spend. */
function Lines({ home, free, onPick }: { home: Homestead; free: number; onPick: () => void }) {
  const empty = !seedTotal(home) && !home.storedCrops?.length && !home.things.some((thing) => thing.turnip);
  return (
    <>
      {empty && (
        <div className="homestead-line">
          <p>{w.empty.line}</p>
          <Button type="button" variant="outline" size="sm" id={PICK_ID} onClick={onPick}>
            {w.empty.pick}
          </Button>
        </div>
      )}
      {free <= 0 && <p className="homestead-line">{w.noXp}</p>}
    </>
  );
}

function ModeLine({ mode, fits, onRotate, onCancel }: { mode: Mode; fits: boolean | null; onRotate: () => void; onCancel: () => void }) {
  return (
    <div className="homestead-mode">
      <p>
        {modeLine(mode)}
        {fits !== null && (
          <>
            {" "}
            <b>{w.modes.here(fits)}</b>
          </>
        )}
      </p>
      <div className="homestead-mode-actions">
        {mode.mode === "place" && mode.kind === "fence" && (
          <Button type="button" variant="outline" size="sm" id="homestead-mode-rotate" onClick={onRotate}>
            {w.modes.rotate}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" id="homestead-mode-cancel" onClick={onCancel}>
          {w.modes.cancel}
        </Button>
      </div>
    </div>
  );
}

const sameTile = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];

/** What opened the seed chooser. */
type Opener = "chip" | "pick" | "card";
/** Where focus goes when the chooser closes: to what opened it, or to the first of what stands in its place. */
const BACK_TO: Record<Opener, string[]> = { chip: [CHOOSER_CHIP_ID], pick: [PICK_ID, CHOOSER_CHIP_ID], card: [PLANT_ID, CARD_SEEDS_ID, CHOOSER_CHIP_ID] };

function Loaded({ home, free }: { home: Homestead; free: number }) {
  const [cursor, setCursor] = useState<Tile>(() => firstTile(home));
  const [selected, setSelected] = useState<Tile | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [chooser, setChooser] = useState(false);
  // What the last press gave a turnip, and where that turnip stands; each press is told from the one before.
  const [given, setGiven] = useState<Burst | null>(null);
  const presses = useRef(0);
  // What opened the chooser: the tray's button, the line's «Выбрать семечко», or the card of an empty bed there is no seed for.
  const opener = useRef<Opener>("chip");
  const focusAfter = useFocusAfter();
  const toScene = (tile?: Tile) => {
    if (tile) setCursor(tile);
    focusAfter(SCENE_ID);
  };

  /** Makes a change, then says what came of it and moves focus to where the next step is. */
  const run = (action: Action) => {
    // From what is saved now, not from what was last drawn.
    const saved = getSaved();
    const before = homesteadOf(saved);
    const tile = targetOf(action);
    const thing = tile ? thingAt(before, tile[0], tile[1]) : undefined;
    const result = apply(before, action, totalXp(saved.xp), dayOf(new Date()));
    if (result.ok) saveHomestead(result.home);
    const left = freeXpOf(getSaved());
    const after = afterOutcome(result.ok ? { ...result, action, free: left, thing } : { ...result, action, free: left, thing });
    setGiven(result.ok && action.action === "grow" ? { at: action.at, amount: result.given, n: ++presses.current } : null);
    if (after.close) setSelected(null);
    if (result.ok && mode && !modeLasts(result.home, mode, left)) setMode(null);
    announce(saidWords(after.said));
    if (after.focus.to === "scene") toScene(after.focus.tile);
  };

  const openChooser = (from: Opener) => {
    opener.current = from;
    setChooser(true);
    // A bed that asked for a seed stays selected: its card comes back when the chooser closes.
    if (from !== "card") setSelected(null);
    setMode(null);
    focusAfter(CHOOSER_TITLE_ID);
  };
  const closeChooser = () => {
    setChooser(false);
    focusAfter(...BACK_TO[opener.current]);
  };
  const toggleChooser = () => (chooser ? closeChooser() : openChooser("chip"));

  const startMode = (next: Mode | null) => {
    if (next?.mode === "grow" && free <= 0) return announce(w.reasons.no_xp);
    setMode(next);
    setSelected(null);
    if (next) {
      setChooser(false);
      setCursor(startTile(home, next, cursor));
    }
    announce(next ? modeLine(next) : w.modes.cancelled);
    toScene();
  };
  const activate = (tile: Tile) => {
    const intent = intentAt(home, mode, tile);
    if (intent.kind === "act") {
      // A thing is placed or moved once: the tool is put down, and a moved thing stays selected where it now stands.
      if (mode?.mode === "place" || mode?.mode === "move") setMode(null);
      if (intent.action.action === "move") setSelected(tile);
      run(intent.action);
    } else if (intent.kind === "select") {
      setSelected(tile);
      setChooser(false);
    } else if (intent.kind === "refuse") announce(w.reasons[intent.reason]);
    else setSelected(null);
  };
  const escape = () => {
    if (mode) startMode(null);
    else setSelected(null);
  };

  const thing: Thing | undefined = selected ? thingAt(home, selected[0], selected[1]) : undefined;
  const close = () => {
    setSelected(null);
    toScene(thing ? [thing.x, thing.y] : undefined);
  };
  const move = (target: Thing) => {
    setCursor([target.x, target.y]);
    startMode({ mode: "move", from: [target.x, target.y], kind: target.kind });
  };
  const buy = (seed: Quality) => run({ action: "buy", seed });
  /** Turns the fence in hand, or the selected one. */
  const rotate = () => {
    if (mode?.mode === "place" && mode.kind === "fence") setMode({ ...mode, rot: mode.rot ? 0 : 1 });
    else if (!mode && thing?.kind === "fence") run({ action: "rotate", at: [thing.x, thing.y] });
  };

  const fits = fitsHere(home, mode, cursor);
  const moved = mode?.mode === "move" ? thingAt(home, mode.from[0], mode.from[1]) : undefined;
  const placing = mode?.mode === "place" ? { kind: mode.kind, rot: mode.rot, turnip: mode.kind === "bed" ? home.storedCrops?.[0] : undefined } : mode?.mode === "move" ? { kind: mode.kind, rot: moved?.rot ?? 0, from: mode.from, turnip: moved?.turnip } : null;
  return (
    <>
      <Paints />
      <Lines home={home} free={free} onPick={() => openChooser("pick")} />
      <Scene
        home={home}
        cursor={cursor}
        marks={marksOf(home, mode, cursor, selected)}
        ghost={placing && { ...placing, x: cursor[0], y: cursor[1], ok: !!fits }}
        fits={fits}
        selected={thing ? selected : null}
        burst={given}
        onCursor={setCursor}
        onActivate={activate}
        onCarry={move}
        onRotate={rotate}
        onEscape={escape}
        tray={<Tray home={home} free={free} mode={mode} onMode={startMode} chooser={chooser} onChooser={toggleChooser} />}
      >
        {mode && <ModeLine mode={mode} fits={fits} onRotate={rotate} onCancel={() => startMode(null)} />}
        {chooser && <SeedChooser home={home} free={free} onBuy={buy} onClose={closeChooser} />}
        {thing && !mode && !chooser && (
          <ThingCard thing={thing} free={free} seeds={heldSeeds(home)} given={given && sameTile(given.at, [thing.x, thing.y]) ? given.amount : null} onAct={run} onMove={move} onSeeds={() => openChooser("card")} onClose={close} />
        )}
      </Scene>
      <HarvestShelf home={home} />
    </>
  );
}
