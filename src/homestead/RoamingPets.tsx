import { memo, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { doorway } from "./Critters";
import { Livestock } from "./Livestock";
import { PetArt } from "./PetArt";
import { advanceWalkers, blockedTiles, poseOf, residents, type Walker } from "./pets";
import { tileKey, type Thing, type Tile } from "./rules";

type Props = {
  things: Thing[];
  rain: boolean;
  placing: boolean;
  onSelect: (tile: Tile) => void;
  onHover: (tile: Tile) => void;
  livestockClass: (tile: Tile) => string;
};
const MovingLivestock = memo(Livestock);
const MovingPet = memo(PetArt);

export function RoamingPets({ things, rain, placing, onSelect, onHover, livestockClass }: Props) {
  const doors = useId();
  const walkers = useRef<Walker[]>([]);
  const [frame, setFrame] = useState(() => residents(things, rain, [], matchMedia("(prefers-reduced-motion: reduce)").matches).map(snapshot));
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const occupied = blockedTiles(things);
    let frameId = 0;
    let previous = 0;
    let restTimer = 0;
    function tick(now: number) {
      const seconds = previous ? Math.min(.25, (now-previous)/1000) : 0;
      previous = now;
      const changed = advanceWalkers(walkers.current, seconds, rain, occupied);
      if (changed) setFrame(walkers.current.map(snapshot));
      if (rain && walkers.current.every((pet) => pet.at.inside && !pet.step)) return;
      if (walkers.current.some((pet) => pet.step || pet.route.length)) frameId = requestAnimationFrame(tick);
      else restTimer = window.setTimeout(() => { frameId = requestAnimationFrame(tick); }, 180);
    }
    function resume() {
      cancelAnimationFrame(frameId);
      clearTimeout(restTimer);
      previous = 0;
      walkers.current = residents(things, rain, walkers.current, motion.matches);
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
  return frame.map(({ kind, home, pose, inside, tile }, i) => {
    const livestock = kind === "cow" || kind === "chicken";
    const style = {
      transform: `translate(${pose.x}px,${pose.y}px)`, zIndex: pose.zIndex,
      opacity: livestock && pose.shelter ? 1 - pose.shelter : undefined, "--i": i,
    } as CSSProperties;
    const facing = `scale(${pose.scale * (pose.left ? -1 : 1)} ${pose.scale})`;
    return (
      <span
        key={kind + tileKey(...home)}
        className={livestock ? `homestead-thing roaming-livestock${livestockClass(home)}` : "roaming-pet"}
        data-thing={livestock ? kind : undefined}
        data-pet={livestock ? undefined : kind}
        data-tile={tile}
        data-sheltered={inside || undefined}
        data-walking={pose.walking || undefined}
        data-placing={placing || undefined}
        aria-hidden="true"
        style={style}
        onPointerEnter={(event) => { if (livestock && event.pointerType === "mouse") onHover(home); }}
        onClick={() => onSelect(home)}
      >
        {livestock ? (
          <svg viewBox="-40 -46 80 52" focusable="false">
            <g transform={facing}><MovingLivestock kind={kind} /></g>
          </svg>
        ) : (
          <svg viewBox="-25 -38 53 44" focusable="false">
            {inside && (
              <defs>
                <clipPath id={doors + kind}>
                  <path d={doorway[kind]} transform={kind === "cat" ? "translate(0 3)" : "translate(-1 -2)"} />
                </clipPath>
              </defs>
            )}
            <g clipPath={inside ? `url(#${doors + kind})` : undefined}>
              <g transform={facing}><MovingPet kind={kind} walking={pose.walking} /></g>
            </g>
          </svg>
        )}
      </span>
    );
  });
}

function snapshot(pet: Walker) {
  return { kind: pet.kind, home: pet.home, pose: poseOf(pet), inside: pet.at.inside && !pet.step, tile: tileKey(...pet.at.tile) };
}
