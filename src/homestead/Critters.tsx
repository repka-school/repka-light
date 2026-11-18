// The homestead's animals: a cat and a dog that wander the free tiles, and
// bees over the bushes and trees. They only decorate: they take no tap, have
// no name and are not saved. They keep still for someone who asked for less
// motion.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { tileCentre } from "./iso";
import { nearestFree, startPets, stepPet, type Pet } from "./pets";
import { cells, tileKey, type Homestead, type Tile } from "./rules";

/** How long a step from tile to tile takes, in ms; homestead.css moves a pet over the same time. */
const STEP_MS = 950;
const BEES = 3;

const same = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];
/** As near the viewer as a thing on the same tile, so a house in front hides a pet behind it. */
const depth = ([x, y]: Tile) => (x + y + 2) * 10;

function CatHead() {
  return (
    <>
      <path d="M-4.5 -4l1 -6.5 4 4.5zM1 -5.5l4.5 -4.5 0.5 6.5z" className="p-cat" />
      <circle r="6" className="p-cat" />
      <ellipse cx="3.5" cy="2" rx="3" ry="2.2" className="p-cat-light" />
      <path d="M-2 -5.6v2.4M0.4 -6v2.4" className="p-cat-mark" />
      <circle cx="2" cy="-1" r="1" className="p-ink" />
      <circle cx="6" cy="1.4" r="0.8" className="p-nose" />
    </>
  );
}

function Cat({ sitting }: { sitting: boolean }) {
  if (sitting) {
    return (
      <>
        <ellipse cx="0" cy="0.5" rx="10" ry="3.2" className="p-shadow" />
        <path d="M-5 -2q-9 1 -8 -6" className="p-tail p-cat-line" />
        <path d="M-6 0C-8 -8 -4 -15 1 -15C6 -15 7 -8 6 0Z" className="p-cat" />
        <path d="M2 -12C5 -10 5.5 -4 5 0L1.5 0C2.5 -4 2.5 -9 2 -12Z" className="p-cat-light" />
        <g transform="translate(3 -19)">
          <CatHead />
        </g>
      </>
    );
  }
  return (
    <>
      <ellipse cx="0" cy="0.5" rx="12" ry="3.4" className="p-shadow" />
      <path d="M-10 -10q-7 -1 -7 -11" className="p-tail p-cat-line" />
      <line x1="-7" y1="-7" x2="-7" y2="0" className="p-leg p-leg-a p-cat-line-far" />
      <line x1="6" y1="-7" x2="6" y2="0" className="p-leg p-leg-b p-cat-line-far" />
      <ellipse cx="0" cy="-10" rx="11" ry="5.5" className="p-cat" />
      <path d="M-5 -15.2v3M-1 -15.5v3M3 -15.2v3" className="p-cat-mark" />
      <line x1="-4" y1="-7" x2="-4" y2="0" className="p-leg p-leg-b p-cat-line" />
      <line x1="9" y1="-7" x2="9" y2="0" className="p-leg p-leg-a p-cat-line" />
      <g transform="translate(11 -15)">
        <CatHead />
      </g>
    </>
  );
}

function DogHead() {
  return (
    <>
      <circle r="7" className="p-dog" />
      <ellipse cx="6.5" cy="2" rx="5" ry="3.6" className="p-dog-light" />
      <ellipse cx="-3.5" cy="1" rx="3.2" ry="6" transform="rotate(18 -3.5 1)" className="p-dog-dark" />
      <circle cx="2" cy="-2" r="1.1" className="p-ink" />
      <circle cx="10.5" cy="1" r="1.4" className="p-ink" />
    </>
  );
}

function Dog({ sitting }: { sitting: boolean }) {
  if (sitting) {
    return (
      <>
        <ellipse cx="0" cy="0.5" rx="12" ry="3.6" className="p-shadow" />
        <path d="M-7 -3q-8 -1 -8 -9" className="p-tail p-wag p-dog-line" />
        <path d="M-8 0C-10 -10 -5 -19 2 -19C8 -19 9 -9 8 0Z" className="p-dog" />
        <path d="M3 -15C7 -12 7.5 -5 7 0L2.5 0C3.5 -5 3.5 -11 3 -15Z" className="p-dog-light" />
        <path d="M-2 -18q4 3 9 1" className="p-collar" />
        <g transform="translate(5 -24)">
          <DogHead />
        </g>
      </>
    );
  }
  return (
    <>
      <ellipse cx="0" cy="0.5" rx="15" ry="3.8" className="p-shadow" />
      <path d="M-13 -15q-5 -4 -3 -10" className="p-tail p-wag p-dog-line" />
      <line x1="-9" y1="-8" x2="-9" y2="0" className="p-leg p-leg-a p-dog-line-far" />
      <line x1="9" y1="-8" x2="9" y2="0" className="p-leg p-leg-b p-dog-line-far" />
      <rect x="-14" y="-19" width="27" height="12" rx="6" className="p-dog" />
      <ellipse cx="2" cy="-8.4" rx="8" ry="1.8" className="p-dog-light" />
      <line x1="-6" y1="-8" x2="-6" y2="0" className="p-leg p-leg-b p-dog-line" />
      <line x1="12" y1="-8" x2="12" y2="0" className="p-leg p-leg-a p-dog-line" />
      <path d="M8 -18q4 4 8 3" className="p-collar" />
      <g transform="translate(15 -22)">
        <DogHead />
      </g>
    </>
  );
}

function Bee() {
  return (
    <svg viewBox="-8 -8 16 16" focusable="false">
      <ellipse cx="-1" cy="-4" rx="2.4" ry="3.6" className="b-wing" />
      <ellipse cx="2" cy="-4.4" rx="2.2" ry="3.4" className="b-wing" />
      <ellipse cx="0" cy="0" rx="4.6" ry="3.3" className="b-body" />
      <path d="M-1.6 -3v6M1.2 -3.1v6.2" className="b-stripe" />
      <circle cx="3.2" cy="-0.6" r="0.7" className="p-ink" />
    </svg>
  );
}

/** Where the bees hover: over a bush, a tree, then the next bush, as far up as its leaves. */
function beeSpots(home: Homestead) {
  const bushes = home.things.filter((thing) => thing.kind === "bush");
  const trees = home.things.filter((thing) => thing.kind === "tree");
  const spots = [bushes[0], trees[0], bushes[1], trees[1], bushes[2]].filter((thing) => thing !== undefined).slice(0, BEES);
  return spots.map((thing) => {
    const centre = tileCentre(thing.x, thing.y);
    return { key: `${thing.x}-${thing.y}`, x: centre.x, y: centre.y - (thing.kind === "tree" ? 62 : 26), z: depth([thing.x, thing.y]) + 1 };
  });
}

export function Critters({ home }: { home: Homestead }) {
  const taken = new Set(home.things.flatMap((thing) => cells(thing.kind, thing.x, thing.y).map(([x, y]) => tileKey(x, y))));
  const free = (tile: Tile) => !taken.has(tileKey(tile[0], tile[1]));
  // The step timer reads what is free now, not what was free when it started.
  const freeNow = useRef(free);
  freeNow.current = free;
  const [pets, setPets] = useState<Pet[]>(() => startPets(free));
  const latest = useRef(pets);
  latest.current = pets;
  useEffect(() => {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const next: Pet[] = [];
      for (const [i, pet] of latest.current.entries()) {
        const others = [...next, ...latest.current.slice(i + 1)];
        next.push(stepPet(pet, (tile) => freeNow.current(tile) && !others.some((other) => same(other.at, tile)), Math.random));
      }
      setPets(next);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      {pets.map((pet) => {
        // A pet a thing was just put on stands beside it until its next step.
        const at = free(pet.at) ? pet.at : (nearestFree(pet.at, free) ?? pet.at);
        const centre = tileCentre(at[0], at[1]);
        const walking = !same(pet.at, pet.from);
        const style: CSSProperties = { translate: `${centre.x}px ${centre.y}px`, zIndex: Math.max(depth(at), depth(pet.from)) };
        return (
          <span key={pet.kind} className={`homestead-pet${walking ? " is-walking" : ""}${pet.left ? " is-left" : ""}`} style={style} aria-hidden="true" data-pet={pet.kind}>
            <svg viewBox="-28 -38 56 44" focusable="false">
              {pet.kind === "cat" ? <Cat sitting={!walking} /> : <Dog sitting={!walking} />}
            </svg>
          </span>
        );
      })}
      {beeSpots(home).map((spot, i) => (
        <span key={spot.key} className="homestead-bee" style={{ left: spot.x, top: spot.y, zIndex: spot.z, "--i": i } as CSSProperties} aria-hidden="true">
          <span>
            <Bee />
          </span>
        </span>
      ))}
    </>
  );
}
