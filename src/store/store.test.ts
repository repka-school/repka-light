import { afterEach, describe, expect, it, vi } from "vitest";
import { apply, starter } from "@/homestead/rules";

const KEY = "repka-light.v1";
const task = { id: "c/l/t", points: 3 };

/**
 * The store loaded in a browser of its own: `items` is what its storage holds,
 * and `otherTab` writes there as another tab of the site would. A `broken`
 * storage refuses every read and write.
 */
async function load(items: Record<string, string> = {}, { broken = false } = {}) {
  const held = new Map(Object.entries(items));
  const listeners: ((event: { key: string | null }) => void)[] = [];
  const refuse = () => {
    throw new Error("storage is off");
  };
  vi.stubGlobal("window", {
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
    first.store.saveProfile({ name: "  Петя  ", avatar: "kitten" });
    first.store.saveRun("c/l", { cards: "k", index: 0, phase: "solving", entries: [{ first: [1], final: null, seen: false, opened: false }] });
    expect(first.written()).toEqual({ version: 2, profile: { name: "Петя", avatar: "kitten", frame: "none" }, courses: { c: { runs: { l: ["k", 0, 0, [0, [1]]] } } } });

    const again = await load(Object.fromEntries(first.held));
    expect(again.store.getSaved()).toEqual(first.store.getSaved());
  });

  it("is not written when a change changes nothing", async () => {
    const { store, held } = await load();
    store.grantXp([task]);
    store.replaceSaved(store.getSaved());
    expect(held.has(KEY)).toBe(false);
  });

  it("lasts for the visit in a browser that refuses storage", async () => {
    const { store } = await load({}, { broken: true });
    expect(store.getSaved().results).toEqual({});
    expect(store.saveResult(task, "first", [2])).toBe(30);
    expect(store.getSaved().results["c/l/t"].outcome).toBe("first");
  });
});

describe("saving a task's result", () => {
  it("keeps how it ended, when, and its experience, and says how much that added", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-04T05:06:07.000Z"));
    const { store, written } = await load();
    expect(store.saveResult(task, "second", [2])).toBe(15);
    expect(store.getSaved()).toMatchObject({ results: { "c/l/t": { outcome: "second", choices: [2] } }, last: { c: "2026-03-04T05:06:07.000Z" }, xp: { "c/l/t": 15 } });
    expect(written().courses).toEqual({ c: { last: "2026-03-04T05:06:07.000Z", results: { "l/t": ["s", 2] }, xp: { "l/t": 15 } } });
  });

  it("adds only the rest when the task is later solved better, and nothing for a repeat", async () => {
    const { store } = await load();
    store.saveResult(task, "second", [2]);
    expect(store.saveResult(task, "first", [1])).toBe(15);
    expect(store.saveResult(task, "first", [1])).toBe(0);
    expect(store.getSaved().xp).toEqual({ "c/l/t": 30 });
  });

  it("keeps the better result when a repeat goes worse, and still marks the course as practised", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-04T05:06:07.000Z"));
    const { store } = await load();
    store.saveResult(task, "first", [1]);
    vi.setSystemTime(new Date("2026-03-05T00:00:00.000Z"));
    expect(store.saveResult(task, "wrong", [4])).toBe(0);
    expect(store.getSaved().results["c/l/t"]).toEqual({ outcome: "first", choices: [1] });
    expect(store.getSaved().last).toEqual({ c: "2026-03-05T00:00:00.000Z" });
  });

  it("gives nothing for a miss", async () => {
    const { store } = await load();
    expect(store.saveResult(task, "wrong", [4])).toBe(0);
    expect(store.getSaved().xp).toEqual({});
  });
});

describe("experience for results saved earlier", () => {
  it("is given once, for the tasks named", async () => {
    const { store } = await load({ [KEY]: '{"version":2,"courses":{"c":{"results":{"l/t":["f",2],"l/u":["s",1]}}}}' });
    store.grantXp([task]);
    expect(store.getSaved().xp).toEqual({ "c/l/t": 30 });
    store.grantXp([task, { id: "c/l/u", points: 1 }]);
    expect(store.getSaved().xp).toEqual({ "c/l/t": 30, "c/l/u": 5 });
  });
});

describe("the reset", () => {
  it("takes the results, practice times and passes, and leaves the profile, the experience and the homestead", async () => {
    const { store, written } = await load();
    store.saveProfile({ name: "Петя" });
    store.saveResult(task, "first", [1]);
    store.saveRun("c/l", { cards: "k", index: 0, phase: "solving", entries: [{ first: null, final: [1], seen: false, opened: false }] });
    const planted = apply(starter(), { action: "plant", at: [2, 5], seed: "common" }, 30, "2026-03-04");
    if (!planted.ok) throw new Error(planted.reason);
    store.saveHomestead(planted.home);

    store.resetProgress();
    expect(store.getSaved()).toEqual({ profile: { name: "Петя", avatar: null, frame: "none" }, results: {}, last: {}, runs: {}, xp: { "c/l/t": 30 }, homestead: planted.home });
    expect(written().courses).toEqual({ c: { xp: { "l/t": 30 } } });
  });
});

describe("an imported backup", () => {
  it("takes the place of everything saved", async () => {
    const { store, written } = await load();
    store.saveResult(task, "first", [1]);
    store.replaceSaved({ profile: { name: "Маша", avatar: null, frame: "none" }, results: { "d/t": { outcome: "second", choices: [3] } }, last: {}, runs: {}, xp: {} });
    expect(Object.keys(store.getSaved().results)).toEqual(["d/t"]);
    expect(written().courses).toEqual({ d: { results: { t: ["s", 3] } } });
  });
});

describe("another tab of the site", () => {
  const theirs = '{"version":2,"profile":{"name":"Маша","avatar":null,"frame":"none"},"courses":{}}';

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
    store.saveProfile({ name: "Петя" });
    const before = store.getSaved();
    otherTab("something-else", "1");
    expect(store.getSaved()).toBe(before);
  });
});

describe("the homestead", () => {
  it("is the starter one until it is changed, with all the experience free", async () => {
    const { store } = await load();
    store.saveResult(task, "first", [1]);
    expect(store.homesteadOf(store.getSaved())).toEqual(starter());
    expect(store.getSaved().homestead).toBeUndefined();
    expect(store.freeXpOf(store.getSaved())).toBe(30);
  });

  it("is saved as it changes, and what was spent there is no longer free", async () => {
    const { store, written } = await load();
    store.saveResult(task, "first", [1]);
    const bought = apply(store.homesteadOf(store.getSaved()), { action: "buy", seed: "common" }, 30, "2026-03-04");
    if (!bought.ok) throw new Error(bought.reason);
    store.saveHomestead(bought.home);
    expect(store.homesteadOf(store.getSaved())).toEqual(bought.home);
    expect(store.freeXpOf(store.getSaved())).toBe(5);
    expect(written().homestead).toMatchObject({ spent: 25, seeds: { common: 2 } });
  });
});
