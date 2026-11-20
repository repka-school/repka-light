import { type CSSProperties } from "react";
import { PetArt } from "./PetArt";
import { tileCentre } from "./iso";
import type { Homestead } from "./rules";

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

export const doorway = {
  cat: "M-13 0C-15-15-8-27 2-27 13-28 20-16 18-2Q8 5-13 0Z",
  dog: "M-7 7v-15c0-7 4-13 10-14s10 2 10 9V2Z",
};

function Shelter({ kind }: { kind: "cat" | "dog" }) {
  if (kind === "cat") return (
    <g transform="translate(-18 16)" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="1" cy="4" rx="23" ry="7" className="g-ground" />
      {/* A willow carrier. The hood wraps around the cushion and meets the raised rim. */}
      <path d="M-21-2C-23-14-18-27-8-30 3-34 17-27 20-14L20 0Q18 8 2 9-15 9-21-2Z" fill="#bc8c55" stroke="#825f42" strokeWidth="1.4" />
      <path d="M-21-4C-21-19-15-27-7-29Q-18-14-14 2Z" fill="#a2764c" />
      <g fill="none" stroke="#dfb880" strokeWidth="1.5">
        <path d="M-20-9q2-13 11-19m-7 23q-1-15 9-24m-11 7q4 0 8 3m-10 3q4 0 8 3m-9 2q4 1 8 3" />
      </g>
      <path d={doorway.cat} fill="#70513d" stroke="#ebc898" strokeWidth="2.8" />
      <path d="M-11-1Q-8-9 2-8 12-10 17-3L17 0Q3 5-11-1Z" fill="#87a68b" />
      <path d="M-7-4q4-2 8-2" fill="none" stroke="#b9cfaf" strokeWidth="1.3" />
      <path d="M-21-4Q-5 4 8 2q8-1 12-5l-1 6Q6 14-16 6q-4-2-5-6Z" fill="#cca16b" stroke="#936f49" strokeWidth="1.1" />
      <path d="M-19 0q20 10 37 0m-33 4q15 7 28 2" fill="none" stroke="#f3d5a6" strokeWidth="1.4" />
    </g>
  );
  return (
    <g transform="translate(-17 18)" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="-2" cy="4" rx="27" ry="8" className="g-ground" />
      {/* The front gable and roof share a ridge. The long eave runs parallel to the side wall. */}
      <path d="M-27-20-10-13-10 9-27 2Z" fill="#bc895c" stroke="#8e6246" strokeWidth="1.3" />
      <path d="m-25-13 13 5m-13 1 13 5m-13 1 13 5" fill="none" stroke="#996d4c" strokeWidth="1.2" />
      <path d="M-10 9v-22L4-34 20-20V1Z" fill="#e6bc82" stroke="#9c744e" strokeWidth="1.3" />
      <path d="m-8-12 25-7m-9-5 5-1m1 13 4-1m-4 6 4-1" fill="none" stroke="#c89460" strokeWidth="1.1" />
      <path d={doorway.dog} fill="#604336" stroke="#fff0ce" strokeWidth="2.3" />
      <path d="M-6 5q10-6 18-4v1L-6 7Z" fill="#a3ac86" />
      <path d="m-11 8 31-9v3l-31 9Z" fill="#b18862" />
      <path d="M-31-19-14-44 4-36-13-11Z" fill="#bd654c" stroke="#884c3d" strokeWidth="1.4" />
      <path d="m-28-22 17 7m-12-14 17 7m-12-14 17 7" fill="none" stroke="#dc9771" strokeWidth="1.15" />
      <path d="m-24-28 3-4m6 8 3-4m-3-6 3-4" fill="none" stroke="#a65342" strokeWidth="1" />
      <path d="m-31-19 18 8v3l-18-8Z" fill="#92503e" />
      <path d="M-14-10 4-37 24-21l-2 2L4-32-12-8Z" fill="#f9e4bb" stroke="#94694c" strokeWidth="1.1" />
      <path d="m-14-44 18 7" fill="none" stroke="#e49d76" strokeWidth="2.4" />
    </g>
  );
}

/** Tray and placement previews show the animal beside its home. */
export function PetSprite({ kind, shelterOnly }: { kind: "cat" | "dog"; shelterOnly: boolean }) {
  return <>
    <Shelter kind={kind} />
    {!shelterOnly && <g transform="translate(15 30)"><PetArt kind={kind} walking={false} /></g>}
  </>;
}

function Butterfly() {
  return (
    <svg viewBox="-10 -11 20 22" focusable="false">
      <g className="butterfly-wings" stroke="#764831" strokeWidth="0.9">
        <path d="M0 2C-5 1-11-4-8-8Q-3-11 0-2Q4-10 8-8C11-4 6 1 0 2Z" fill="var(--wing)" />
        <path d="M0 0Q-9-2-6 5Q-3 9 0 3Q4 10 7 5Q8 1 0 0Z" fill="var(--wing)" />
        <path d="m-6-6 2 1m8 0 2-1" stroke="#fff3d3" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path d="M0-3v7m0-6-2-4m2 4 2-4" fill="none" stroke="#583f39" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Critters({ home }: { home: Homestead }) {
  const bushes = home.things.filter((thing) => thing.kind === "bush");
  const trees = home.things.filter((thing) => thing.kind === "tree");
  const bed = home.things.find((thing) => thing.kind === "bed");
  return [bushes[0], trees[0], bushes[1], bed, bushes[2] ?? trees[1]].map((thing, i) => {
    if (!thing) return null;
    const butterfly = i >= 3;
    const centre = tileCentre(thing.x, thing.y);
    const height = thing.kind === "tree" ? 62 : 26;
    const style = { left: centre.x, top: centre.y - height, zIndex: (thing.x + thing.y + 2) * 10 + 1, "--i": i, "--wing": i === 3 ? "#ffac65" : "#b3a1f2" } as CSSProperties;
    return (
      <span key={i} className={`homestead-insect ${butterfly ? "homestead-butterfly" : "homestead-bee"}`} style={style} aria-hidden="true">
        <span>{butterfly ? <Butterfly /> : <Bee />}</span>
      </span>
    );
  });
}
