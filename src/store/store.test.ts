import { afterEach, describe, expect, it, vi } from "vitest";
import { apply, starter } from "@/homestead/rules";
import { mergeRun, withRun, type Saved, type SavedRun } from "./storage";

const KEY = "repka-light.v1";
const task = { id: "c/l/t", points: 3 };

/** Hold the origin's write lock until the test lets waiting tabs run, one at a time. */
function heldLock() {
  type OnLock = (lock: Lock) => unknown;
  let release!: () => void;
  let tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  const request = vi.fn((name: string, optionsOrCallback: LockOptions | OnLock, callback?: OnLock) => {
    expect(name).toBe(KEY);
    const run = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
    const result = tail.then(() => run({ name, mode: "exclusive" }));
    tail = result.then(() => undefined, () => undefined);
    return result;
  });
  return { release, request };
}

type BrowserOptions = {
  broken?: boolean;
  held?: Map<string, string>;
  locks?: ReturnType<typeof heldLock> | null;
};

function availableLock() {
  const locks = heldLock();
  locks.release();
  return locks;
}

/**
 * The store loaded in a browser of its own: `items` is what its storage holds,
 * and `otherTab` writes there as another tab of the site would. A `broken`
 * storage refuses every read and write.
 */
async function load(items: Record<string, string> = {}, { broken = false, held = new Map(Object.entries(items)), locks = availableLock() }: BrowserOptions = {}) {
  const listeners: ((event: { key: string | null }) => void)[] = [];
  const refuse = () => {
    throw new Error("storage is off");
  };
  const navigator = locks ? { locks } : {};
  vi.stubGlobal("navigator", navigator);
  vi.stubGlobal("window", {
    navigator,
    localStorage: broken ? { getItem: refuse, setItem: refuse } : { getItem: (key: string) => held.get(key) ?? null, setItem: (key: string, value: string) => void held.set(key, value) },
    addEventListener: (type: string, listener: (event: { key: string | null }) => void) => type === "storage" && listeners.push(listener),
  });
  vi.resetModules();
  const store = await import("./store");
  const otherTab = (key: string | null, value?: string) => {
    if (key !== null && value !== undefined) held.set(key, value);
    if (key === null) held.clear();
    listeners.forEach((listener) => listener({ key }));
  };
  return { store, held, otherTab, written: () => JSON.parse(held.get(KEY) ?? "null") };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the saved state", () => {
  it("starts empty in a browser that holds nothing", async () => {
    const { store } = await load();
    expect(store.getSaved()).toEqual({ profile: { name: "", avatar: null, frame: "none" }, results: {}, last: {}, runs: {}, xp: {} });
  });

  it("is read from the site's key", async () => {
    const { store } = await load({ [KEY]: '{"version":2,"profile":{"name":"Маша","avatar":"kitten","frame":"sea"},"courses":{"c":{"results":{"l/t":["f",2]},"xp":{"l/t":30}}}}' });
    expect(store.getSaved()).toMatchObject({ profile: { name: "Маша" }, results: { "c/l/t": { outcome: "first", choices: [2] } }, xp: { "c/l/t": 30 } });
  });

  it("is written through as it changes, and is there after a reload", async () => {
    const first = await load();
    await first.store.saveProfile({ name: "  Петя  ", avatar: "kitten" });
    await first.store.saveRun((saved) => withRun(saved, "c/l", { cards: "k", index: 0, phase: "solving", entries: [{ first: [1], final: null, seen: false, opened: false }] }));
    expect(first.written()).toEqual({ version: 2, profile: { name: "Петя", avatar: "kitten", frame: "none" }, courses: { c: { runs: { l: ["k", 0, 0, [0, [1]]] } } } });

    const again = await load(Object.fromEntries(first.held));
    expect(again.store.getSaved()).toEqual(first.store.getSaved());
  });

  it("is not written when a change changes nothing", async () => {
    const { store, held } = await load();
    await store.grantXp([task]);
    await store.replaceSaved(store.getSaved());
    expect(held.has(KEY)).toBe(false);
  });

  it("lasts for the visit in a browser that refuses storage", async () => {
    const { store } = await load({}, { broken: true });
    expect(store.getSaved().results).toEqual({});
    expect(await store.saveResult(task, "first", [2])).toEqual({ gained: 30, level: null });
    expect(store.getSaved().results["c/l/t"].outcome).toBe("first");
    expect(store.isMemoryOnly()).toBe(true);
  });

  it("keeps successive actions in memory when the browser has no shared locking API", async () => {
    const { store, held } = await load({}, { locks: null });
    const writes = vi.spyOn(held, "set");
    await store.saveProfile({ name: "Петя" });
    expect(await store.saveResult(task, "first", [1])).toEqual({ gained: 30, level: null });
    expect(store.getSaved()).toMatchObject({
      profile: { name: "Петя" }, results: { "c/l/t": { outcome: "first", choices: [1] } }, xp: { "c/l/t": 30 },
    });
    expect(writes).not.toHaveBeenCalled();
  });

  it("keeps unsaved practice when another tab writes and persists both after recovery", async () => {
    const { store, otherTab, written } = await load();
    const write = vi.spyOn(window.localStorage, "setItem").mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
    await store.saveResult(task, "first", [1]);
    expect(store.isMemoryOnly()).toBe(true);
    otherTab(KEY, '{"version":2,"profile":{"name":"Аня"},"courses":{"other":{"xp":{"drill":4}}}}');
    expect(store.getSaved().xp).toEqual({ "other/drill": 4, "c/l/t": 30 });
    expect(store.getSaved().profile.name).toBe("Аня");

    await store.grantXp([]);
    expect(write).toHaveBeenCalledTimes(2);
    expect(store.isMemoryOnly()).toBe(false);
    expect(written().courses).toMatchObject({ c: { results: { "l/t": ["f", 1] } }, other: { xp: { drill: 4 } } });
  });

  it("leaves the current profile and practice intact when a replacement fails", async () => {
    const { store, written } = await load();
    await store.saveResult(task, "first", [1]);
    const durable = written();
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    await store.saveProfile({ name: "Петя" });
    const before = store.getSaved();
    const incoming = { ...before, profile: { ...before.profile, name: "Маша" }, results: {}, xp: {} };
    expect(await store.replaceSaved(incoming)).toBe(false);
    expect(store.getSaved()).toEqual(before);
    expect(await store.resetProgress()).toBe(false);
    expect(store.getSaved()).toEqual(before);
    expect(written()).toEqual(durable);
  });
});

describe("saving a task's result", () => {
  it("keeps how it ended, when, and its experience, and says how much that added", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-04T05:06:07.000Z"));
    const { store, written } = await load();
    expect(await store.saveResult(task, "second", [2])).toEqual({ gained: 15, level: null });
    expect(store.getSaved()).toMatchObject({ results: { "c/l/t": { outcome: "second", choices: [2] } }, last: { c: "2026-03-04T05:06:07.000Z" }, xp: { "c/l/t": 15 } });
    expect(written().courses).toEqual({ c: { last: "2026-03-04T05:06:07.000Z", results: { "l/t": ["s", 2] }, xp: { "l/t": 15 } } });
  });

  it("adds only the rest when the task is later solved better, and nothing for a repeat", async () => {
    const { store } = await load();
    await store.saveResult(task, "second", [2]);
    expect(await store.saveResult(task, "first", [1])).toEqual({ gained: 15, level: null });
    expect(await store.saveResult(task, "first", [1])).toEqual({ gained: 0, level: null });
    expect(store.getSaved().xp).toEqual({ "c/l/t": 30 });
  });

  it("keeps the better result when a repeat goes worse, and still marks the course as practised", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-04T05:06:07.000Z"));
    const { store } = await load();
    await store.saveResult(task, "first", [1]);
    vi.setSystemTime(new Date("2026-03-05T00:00:00.000Z"));
    expect(await store.saveResult(task, "wrong", [4])).toEqual({ gained: 0, level: null });
    expect(store.getSaved().results["c/l/t"]).toEqual({ outcome: "first", choices: [1] });
    expect(store.getSaved().last).toEqual({ c: "2026-03-05T00:00:00.000Z" });
  });

  it("gives nothing for a miss", async () => {
    const { store } = await load();
    expect(await store.saveResult(task, "wrong", [4])).toEqual({ gained: 0, level: null });
    expect(store.getSaved().xp).toEqual({});
  });
});

describe("experience for results saved earlier", () => {
  it("is given once, for the tasks named", async () => {
    const { store } = await load({ [KEY]: '{"version":2,"courses":{"c":{"results":{"l/t":["f",2],"l/u":["s",1]}}}}' });
    await store.grantXp([task]);
    expect(store.getSaved().xp).toEqual({ "c/l/t": 30 });
    await store.grantXp([task, { id: "c/l/u", points: 1 }]);
    expect(store.getSaved().xp).toEqual({ "c/l/t": 30, "c/l/u": 5 });
  });
});

describe("the reset", () => {
  it("takes the results, practice times and passes, and leaves the profile, the experience and the homestead", async () => {
    const { store, written } = await load();
    await store.saveProfile({ name: "Петя" });
    await store.saveResult(task, "first", [1]);
    await store.saveRun((saved) => withRun(saved, "c/l", { cards: "k", index: 0, phase: "solving", entries: [{ first: null, final: [1], seen: false, opened: false }] }));
    const planted = apply(starter(), { action: "plant", at: [2, 5], seed: "common" }, 30, "2026-03-04");
    if (!planted.ok) throw new Error(planted.reason);
    await store.saveHomestead(planted.home);

    await store.resetProgress();
    expect(store.getSaved()).toEqual({ profile: { name: "Петя", avatar: null, frame: "none" }, results: {}, last: {}, runs: {}, xp: { "c/l/t": 30 }, homestead: planted.home });
    expect(written().courses).toEqual({ c: { xp: { "l/t": 30 } } });
  });
});

describe("an imported backup", () => {
  it("takes the place of everything saved", async () => {
    const { store, written } = await load();
    await store.saveResult(task, "first", [1]);
    await store.replaceSaved({ profile: { name: "Маша", avatar: null, frame: "none" }, results: { "d/t": { outcome: "second", choices: [3] } }, last: {}, runs: {}, xp: {} });
    expect(Object.keys(store.getSaved().results)).toEqual(["d/t"]);
    expect(written().courses).toEqual({ d: { results: { t: ["s", 3] } } });
  });
});

describe("another tab of the site", () => {
  const theirs = '{"version":2,"profile":{"name":"Маша","avatar":null,"frame":"none"},"courses":{}}';

  it("saves both tabs' answers to different cards, including their run entries, in one write per answer", async () => {
    const blank = { first: null, final: null, seen: false, opened: false };
    const previous: SavedRun = { cards: "k", index: 0, phase: "solving", entries: [blank, blank] };
    const firstRun: SavedRun = { ...previous, entries: [{ ...blank, final: [1] }, blank] };
    const secondRun: SavedRun = { ...previous, index: 1, entries: [blank, { ...blank, first: [3], final: [2] }] };
    const locks = heldLock();
    const first = await load({ [KEY]: JSON.stringify({ version: 2, courses: { c: { runs: { l: ["k", 0, 0, [0], [0]] } } } }) }, { locks });
    const second = await load({}, { held: first.held, locks });
    const writes = vi.spyOn(first.held, "set");

    const applyRun = (run: SavedRun) => (saved: Saved) => withRun(saved, "c/l", mergeRun(saved.runs["c/l"], previous, run));
    const answer1 = first.store.saveResult(task, "first", [1], applyRun(firstRun));
    const answer2 = second.store.saveResult({ id: "c/l/u", points: 2 }, "second", [2], applyRun(secondRun));
    expect(writes).not.toHaveBeenCalled();
    expect(first.store.getSaved().runs["c/l"]).toEqual(firstRun);
    expect(second.store.getSaved().runs["c/l"]).toEqual(secondRun);
    locks.release();
    expect(await Promise.all([answer1, answer2])).toEqual([{ gained: 30, level: null }, { gained: 10, level: null }]);

    expect(writes).toHaveBeenCalledTimes(2);
    expect(JSON.parse(writes.mock.calls[0][1]).courses.c).toMatchObject({
      results: { "l/t": ["f", 1] }, xp: { "l/t": 30 }, runs: { l: ["k", 0, 0, [0, 0, [1]], [0]] },
    });
    expect(first.written().courses.c).toMatchObject({
      results: { "l/t": ["f", 1], "l/u": ["s", 2] }, xp: { "l/t": 30, "l/u": 10 }, runs: { l: ["k", 1, 0, [0, 0, [1]], [0, [3], [2]]] },
    });
    expect(second.store.getSaved().xp).toEqual({ "c/l/t": 30, "c/l/u": 10 });
    expect(locks.request).toHaveBeenCalledTimes(2);
  });

  it("gives experience and announces a level-up to the first tab to settle the same answer", async () => {
    const locks = heldLock();
    const first = await load({ [KEY]: '{"version":2,"courses":{"c":{"xp":{"earlier":90}}}}' }, { locks });
    const second = await load({}, { held: first.held, locks });
    const answer1 = first.store.saveResult(task, "first", [1]);
    const answer2 = second.store.saveResult(task, "first", [1]);
    locks.release();
    expect(await Promise.all([answer1, answer2])).toEqual([{ gained: 30, level: 2 }, { gained: 0, level: null }]);
    expect(first.written().courses.c.xp).toEqual({ earlier: 90, "l/t": 30 });
  });

  it("is followed when it changes the saved state", async () => {
    const { store, otherTab } = await load();
    otherTab(KEY, theirs);
    expect(store.getSaved().profile.name).toBe("Маша");
  });

  it("is followed when it clears the storage", async () => {
    const { store, otherTab } = await load({ [KEY]: theirs });
    otherTab(null);
    expect(store.getSaved().profile.name).toBe("");
  });

  it("is ignored when it writes under another key", async () => {
    const { store, otherTab } = await load();
    await store.saveProfile({ name: "Петя" });
    const before = store.getSaved();
    otherTab("something-else", "1");
    expect(store.getSaved()).toBe(before);
  });
});

describe("the homestead", () => {
  it("is the starter one until it is changed, with all the experience free", async () => {
    const { store } = await load();
    await store.saveResult(task, "first", [1]);
    expect(store.homesteadOf(store.getSaved())).toEqual(starter());
    expect(store.getSaved().homestead).toBeUndefined();
    expect(store.freeXpOf(store.getSaved())).toBe(30);
  });

  it("is saved as it changes, and what was spent there is no longer free", async () => {
    const { store, written } = await load();
    await store.saveResult(task, "first", [1]);
    const bought = apply(store.homesteadOf(store.getSaved()), { action: "buy", seed: "common" }, 30, "2026-03-04");
    if (!bought.ok) throw new Error(bought.reason);
    await store.saveHomestead(bought.home);
    expect(store.homesteadOf(store.getSaved())).toEqual(bought.home);
    expect(store.freeXpOf(store.getSaved())).toBe(5);
    expect(written().homestead).toMatchObject({ spent: 25, seeds: { common: 2 } });
  });
});
