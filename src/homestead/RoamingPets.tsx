import { useEffect, useId, useRef, useState } from "react";
import { doorway } from "./Critters";
import { PetArt } from "./PetArt";
import { advance, blockedTiles, poseOf, startWalker, type Walker } from "./pets";
import { tileKey, type Thing, type Tile } from "./rules";

type Props = { things: Thing[]; rain: boolean; placing: boolean; onSelect: (tile: Tile) => void };

function residents(things: Thing[], rain: boolean, previous: Walker[]) {
  return things.flatMap(({ kind, x, y }) => {
    if (kind !== "cat" && kind !== "dog") return [];
    return previous.find((p) => p.kind === kind && p.home[0] === x && p.home[1] === y) ?? startWalker(kind, [x, y], rain);
  });
}

export function RoamingPets({ things, rain, placing, onSelect }: Props) {
  const doors = useId();
  const walkers = useRef<Walker[]>([]);
  const [frame, setFrame] = useState(() => residents(things, rain, []).map(snapshot));
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const occupied = blockedTiles(things);
    let frameId = 0;
    let previous = 0;
    let restTimer = 0;
    function tick(now: number) {
      const seconds = previous ? Math.min(.25, (now-previous)/1000) : 0;
      previous = now;
      let changed = false;
      for (const pet of walkers.current) {
        const blocked = new Set(occupied);
        for (const other of walkers.current) {
          if (other === pet) continue;
          blocked.add(tileKey(...other.at.tile));
          if (other.step) blocked.add(tileKey(...other.step.to.tile));
        }
        changed = advance(pet, seconds, rain, blocked) || changed;
      }
      if (changed) setFrame(walkers.current.map(snapshot));
      if (walkers.current.some((pet) => pet.step || pet.route.length)) frameId = requestAnimationFrame(tick);
      else restTimer = window.setTimeout(() => { frameId = requestAnimationFrame(tick); }, 180);
    }
    function resume() {
      cancelAnimationFrame(frameId);
      clearTimeout(restTimer);
      previous = 0;
      walkers.current = residents(things, rain, motion.matches ? [] : walkers.current);
      setFrame(walkers.current.map(snapshot));
      if (!motion.matches && !document.hidden && walkers.current.length) frameId = requestAnimationFrame(tick);
    }
    resume();
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", resume);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(restTimer);
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", resume);
    };
  }, [things, rain]);
  return frame.map(({ kind, home, pose, inside, tile }) => (
    <span key={kind} className="roaming-pet" data-pet={kind} data-tile={tile} data-sheltered={inside || undefined}
      data-walking={pose.walking || undefined} data-placing={placing || undefined} aria-hidden="true"
      style={{ transform: `translate(${pose.x}px,${pose.y}px)`, zIndex: pose.zIndex }}
      onClick={() => onSelect(home)}>
      <svg viewBox="-25 -38 53 44" focusable="false">
        {inside && <defs><clipPath id={doors+kind}>
          <path d={doorway[kind]} transform={kind === "cat" ? "translate(0 3)" : "translate(-1 -2)"} />
        </clipPath></defs>}
        <g clipPath={inside ? `url(#${doors+kind})` : undefined}>
          <g transform={`scale(${pose.scale*(pose.left ? -1 : 1)} ${pose.scale})`}>
            <PetArt kind={kind} walking={pose.walking} />
          </g>
        </g>
      </svg>
    </span>
  ));
}

function snapshot(pet: Walker) {
  return { kind: pet.kind, home: pet.home, pose: poseOf(pet), inside: pet.at.inside && !pet.step, tile: tileKey(...pet.at.tile) };
}
