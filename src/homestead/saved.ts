// A homestead as it is saved: only what cannot be worked out again. A thing
// is a short list, [kind, x, y], followed by 1 for a turned fence or by a
// bed's turnip: its quality, the experience given to it and, once ripe, the
// day it ripened. Stock, stages and prices are not saved: the rules give them.
import { isRipe, KINDS, OWNED, placeRefusal, QUALITIES, SEEDS, starter, type Gathered, type Homestead, type Kind, type Quality, type Thing, type Turnip } from "./rules";

export type PackedThing = [kind: Kind, x: number, y: number, ...rest: (string | number)[]];

export type PackedHomestead = {
  spent: number;
  seeds: Partial<Record<Quality, number>>;
  things: PackedThing[];
  /** By quality: how many were gathered, and the latest day one of them ripened. */
  harvest: Partial<Record<Quality, [count: number, latest: string]>>;
};

function packThing({ kind, x, y, rot, turnip }: Thing): PackedThing {
  if (turnip) return turnip.ripened ? [kind, x, y, turnip.type, turnip.given, turnip.ripened] : [kind, x, y, turnip.type, turnip.given];
  return rot ? [kind, x, y, 1] : [kind, x, y];
}

export function pack(home: Homestead): PackedHomestead {
  const harvest: PackedHomestead["harvest"] = {};
  for (const type of QUALITIES) {
    const gathered = home.harvest[type];
    if (gathered) harvest[type] = [gathered.count, gathered.latest];
  }
  return { spent: home.spent, seeds: home.seeds, things: home.things.map(packThing), harvest };
}

const isQuality = (value: unknown): value is Quality => QUALITIES.includes(value as Quality);
const isKind = (value: unknown): value is Kind => KINDS.includes(value as Kind);
const count = (value: unknown): number => (Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : 0);
const day = (value: unknown): string => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "");

function unpackTurnip(type: unknown, given: unknown, ripened: unknown): Turnip | undefined {
  if (!isQuality(type)) return undefined;
  const turnip: Turnip = { type, given: Math.min(count(given), SEEDS[type].total) };
  if (isRipe(turnip) && day(ripened)) turnip.ripened = day(ripened);
  return turnip;
}

/**
 * The saved things that can stand where they are saved: a thing of an unknown
 * kind, one more than is owned, one off the ground or on a taken tile is left
 * out, which puts it back in stock.
 */
function unpackThings(raw: unknown[]): Thing[] {
  const things: Thing[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry)) continue;
    const [kind, x, y, a, b, c] = entry as unknown[];
    if (!isKind(kind) || !Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (things.filter((thing) => thing.kind === kind).length >= OWNED[kind]) continue;
    if (placeRefusal(things, kind, x as number, y as number)) continue;
    const thing: Thing = { kind, x: x as number, y: y as number, rot: kind === "fence" && a === 1 ? 1 : 0 };
    const turnip = kind === "bed" ? unpackTurnip(a, b, c) : undefined;
    things.push(turnip ? { ...thing, turnip } : thing);
  }
  return things;
}

/** Whatever was saved as a homestead, made safe to use; undefined when nothing usable was. */
export function unpack(raw: unknown): Homestead | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const { spent, seeds, things, harvest } = raw as Record<string, unknown>;
  const home: Homestead = { spent: count(spent), seeds: {}, things: Array.isArray(things) ? unpackThings(things) : starter().things, harvest: {} };
  for (const type of QUALITIES) {
    const held = count((seeds as Record<string, unknown> | null | undefined)?.[type]);
    if (held) home.seeds[type] = held;
    const gathered = (harvest as Record<string, unknown> | null | undefined)?.[type];
    if (Array.isArray(gathered) && count(gathered[0])) home.harvest[type] = { count: count(gathered[0]), latest: day(gathered[1]) } satisfies Gathered;
  }
  return home;
}
