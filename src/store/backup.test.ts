import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, fromBackup, readBackup, toBackup } from "./backup";
import { apply, starter } from "@/homestead/rules";
import { pack } from "@/homestead/saved";
import { cardsKey, empty, withDrillResult, withoutResults, withPractice, withProfile, withResult, withRun, withXp, type Saved } from "./storage";

const now = new Date("2026-03-04T05:06:07.000Z");
const filled = () =>
  withXp(
    withRun(
      withPractice(withResult(withProfile(empty(), { name: "Маша", avatar: "fox-cub", frame: "sea" }), "c/t1", { outcome: "first", choices: [2] }), "c/t1", "2026-03-01T00:00:00.000Z"),
      "c/l1",
      { cards: cardsKey(["a", "b"]), index: 1, phase: "solving", entries: [{ first: [1], final: [2], seen: true, opened: false }, { first: null, final: null, seen: false, opened: false }] },
    ),
    [{ id: "c/t1", points: 2 }],
  );

/** The filled state as a version 3 site wrote it: every id in full, a time on every result, the card ids in every pass. */
const version3 = {
  format: BACKUP_FORMAT,
  version: 3,
  exportedAt: "2026-03-04T05:06:07.000Z",
  profile: { name: "Маша", avatar: "fox-cub", frame: "sea" },
  results: { "c/t1": { outcome: "first", choices: [2], at: "2026-03-01T00:00:00.000Z" } },
  runs: { "c/l1": { cards: ["a", "b"], index: 1, phase: "solving", entries: [{ first: [1], final: { choices: [2], correct: true }, seen: true, opened: false }, { first: null, final: null, seen: false, opened: false }] } },
  xp: { "c/t1": 20 },
};

describe("toBackup", () => {
  it("marks the file with its format, version and date", () => {
    const backup = toBackup(empty(), now);
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: "2026-03-04T05:06:07.000Z" });
  });

  it("names the file by day and time", () => {
    expect(backupFileName(new Date(2026, 2, 4, 5, 6, 7))).toBe("repka-progress-2026-03-04-0506.json");
  });
});

describe("fromBackup", () => {
  it("accepts an intentionally empty export from each format", () => {
    for (let version = 1; version <= BACKUP_VERSION; version++) {
      const body = version < 4 ? { results: {}, runs: {}, ...(version > 1 && { xp: {} }) } : { courses: {} };
      const read = fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version, profile: empty().profile, ...body }));
      expect(read.ok && read.saved).toEqual(empty());
    }
  });

  it("rejects incomplete replacements before the storage reader can discard their records", () => {
    const header = { format: BACKUP_FORMAT, version: BACKUP_VERSION };
    const bodies = [
      header, { ...header, courses: {} }, { ...header, profile: {} }, { ...header, profile: [], courses: {} },
      ...[[], null, { c: [] }, { c: { results: [] } }, { c: { xp: { x: -5 } } }, { c: { results: { x: ["w", "bad"] } } },
        { c: { runs: { l: ["k", 0, 0, [0, {}]] } } }, { c: { drillDays: { x: ["2026-01-01", 99] } } }]
        .map((courses) => ({ ...header, profile: {}, courses })),
      { ...header, version: 1, profile: {}, results: {} },
      { ...header, version: 3, profile: {}, results: {}, runs: {} },
      { ...version3, results: { task: { outcome: "first", choices: "bad", at: "" } } },
      { ...version3, runs: { lesson: { ...version3.runs["c/l1"], entries: [null, null] } } },
    ];
    for (const body of bodies) expect(fromBackup(JSON.stringify(body))).toEqual({ ok: false, error: "notBackup" });
  });

  it("reports a file that the browser cannot read", async () => {
    const file = { size: 100, text: async () => { throw new Error("File disappeared"); } };
    expect(await readBackup(file)).toEqual({ ok: false, error: "unreadable" });
  });

  it("round-trips profile, results, lesson passes and experience", () => {
    const saved = filled();
    expect(saved.xp).toEqual({ "c/t1": 20 });
    const read = fromBackup(JSON.stringify(toBackup(saved, now)));
    expect(read).toEqual({ ok: true, saved, exportedAt: "2026-03-04T05:06:07.000Z" });
  });

  it("keeps the best game, the XP earned across days and what the game gave on its last day in a backup", () => {
    const id = "multiplication/times-2/game";
    const first = withDrillResult(empty(), id, 10, 317, "2026-03-01T00:00:00.000Z", "2026-03-01");
    const replay = withDrillResult(first, id, 6, 404, "2026-03-02T00:00:00.000Z", "2026-03-02");
    const read = fromBackup(JSON.stringify(toBackup(replay, now)));
    expect(read).toMatchObject({ ok: true, saved: { drills: { [id]: 10 }, bestAnswerTimeTenths: { [id]: 317 }, xp: { [id]: 16 }, drillDays: { [id]: { day: "2026-03-02", score: 6 } } } });
    expect(withoutResults(replay).bestAnswerTimeTenths).toBeUndefined();
  });

  it("imports a file written before a game's day was kept", () => {
    const course = { drills: { game: 8 }, bestAnswerTimeTenths: { game: 350 }, xp: { game: 16 } };
    const read = fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 7, profile: empty().profile, courses: { c: course } }));
    expect(read).toEqual({ ok: true, exportedAt: "", saved: { ...empty(), drills: { "c/game": 8 }, bestAnswerTimeTenths: { "c/game": 350 }, xp: { "c/game": 16 } } });
  });

  it("imports an older drill score without inventing a time record", () => {
    const read = fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 5, profile: empty().profile, courses: { c: { drills: { game: 8 } } } }));
    expect(read.ok && read.saved.drills).toEqual({ "c/game": 8 });
    expect(read.ok && read.saved.bestAnswerTimeTenths).toBeUndefined();
  });

  it("imports a wall-clock record's score and XP without treating it as answer time", () => {
    const course = { drills: { game: 8 }, xp: { game: 16 }, drillBestTenths: { game: 350 } };
    const read = fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 6, profile: empty().profile, courses: { c: course } }));
    expect(read).toEqual({ ok: true, exportedAt: "", saved: { ...empty(), drills: { "c/game": 8 }, xp: { "c/game": 16 } } });
  });

  it("keeps the state in the short form, grouped by course", () => {
    const backup = toBackup(filled(), now);
    expect(backup.courses.c).toMatchObject({ last: "2026-03-01T00:00:00.000Z", results: { t1: ["f", 2] }, xp: { t1: 20 } });
    expect("results" in backup).toBe(false);
  });

  it("reads a version 4 file as it was downloaded", () => {
    // A file the site has written, letter for letter: it has to keep loading as it does here.
    const text =
      '{"format":"repka-light-backup","version":4,"exportedAt":"2026-03-04T05:06:07.000Z","profile":{"name":"Маша","avatar":"fox-cub","frame":"sea"},' +
      '"courses":{"c":{"last":"2026-03-01T00:00:00.000Z","results":{"t1":["f",2]},"xp":{"t1":20},"runs":{"l1":["bch440",1,0,[1,[1],[2]],[0]]}}}}';
    expect(fromBackup(text)).toEqual({ ok: true, saved: filled(), exportedAt: "2026-03-04T05:06:07.000Z" });
    expect(JSON.stringify(toBackup(filled(), now))).toBe(text.replace('"version":4', `"version":${BACKUP_VERSION}`));
  });

  it("loads a file with a course named __proto__ as any other", () => {
    const read = fromBackup('{"format":"repka-light-backup","version":4,"profile":{},"courses":{"__proto__":{"results":{"x":["f",1]},"xp":{"x":10}}}}');
    expect(read.ok && read.saved.results["__proto__/x"]).toEqual({ outcome: "first", choices: [1] });
    expect(read.ok && toBackup(read.saved, now).courses["__proto__"]).toEqual({ results: { x: ["f", 1] }, xp: { x: 10 } });
    expect(({} as Record<string, unknown>).results).toBeUndefined();
  });

  it("loads a version 3 file, with every id in full", () => {
    expect(fromBackup(JSON.stringify(version3))).toEqual({ ok: true, saved: filled(), exportedAt: "2026-03-04T05:06:07.000Z" });
  });

  it("loads a version 1 file, which had no experience", () => {
    const { xp: _xp, ...old } = version3;
    const read = fromBackup(JSON.stringify({ ...old, version: 1 }));
    expect(read.ok && read.saved).toEqual({ ...filled(), xp: {} });
  });

  /** The filled state with the free seed planted and grown a little. */
  function withHomestead(): Saved {
    const planted = apply(starter(), { action: "plant", at: [2, 5], seed: "common" }, 20, "2026-03-02");
    const grown = planted.ok ? apply(planted.home, { action: "grow", at: [2, 5], amount: 10 }, 20, "2026-03-02") : planted;
    if (!grown.ok) throw new Error(grown.reason);
    return { ...filled(), homestead: grown.home };
  }

  it("round-trips the homestead, in its short form", () => {
    const saved = withHomestead();
    const backup = toBackup(saved, now);
    expect(backup.homestead).toMatchObject({ spent: 10, seeds: {}, harvest: {} });
    expect(backup.homestead?.things).toContainEqual(["bed", 2, 5, "common", 10]);
    const read = fromBackup(JSON.stringify(backup));
    expect(read.ok && read.saved).toEqual(saved);
  });

  it("writes no homestead while it is the starter one", () => {
    expect("homestead" in toBackup(filled(), now)).toBe(false);
  });

  it("loads a version 3 file with a homestead", () => {
    const saved = withHomestead();
    const read = fromBackup(JSON.stringify({ ...version3, homestead: pack(saved.homestead!) }));
    expect(read.ok && read.saved).toEqual(saved);
  });

  it("loads a version 2 file, which had no homestead", () => {
    const read = fromBackup(JSON.stringify({ ...version3, version: 2, homestead: pack(withHomestead().homestead!) }));
    expect(read.ok && read.saved).toEqual(filled());
  });

  it("refuses text that is not JSON", () => {
    expect(fromBackup("{oops")).toEqual({ ok: false, error: "notJson" });
  });

  it("refuses JSON that is not a backup", () => {
    expect(fromBackup("[]")).toEqual({ ok: false, error: "notBackup" });
    expect(fromBackup(JSON.stringify({ version: 1, profile: {} }))).toEqual({ ok: false, error: "notBackup" });
    expect(fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 0 }))).toEqual({ ok: false, error: "notBackup" });
    expect(fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version: "1" }))).toEqual({ ok: false, error: "notBackup" });
    // The localStorage value itself is not a backup file.
    expect(fromBackup(JSON.stringify(filled()))).toEqual({ ok: false, error: "notBackup" });
  });

  it("refuses a file from a newer version instead of half-reading it", () => {
    expect(fromBackup(JSON.stringify({ ...toBackup(filled(), now), version: BACKUP_VERSION + 1 }))).toEqual({ ok: false, error: "tooNew" });
  });

  it("refuses a file far too large to be a backup", () => {
    expect(fromBackup(" ".repeat(5 * 1024 * 1024 + 1))).toEqual({ ok: false, error: "tooLarge" });
  });

  it("normalizes a nickname and an unknown avatar from an older profile", () => {
    const read = fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, profile: { name: "  Петя ", avatar: "dragon" }, results: {}, runs: {} }));
    expect(read.ok && read.saved).toEqual({ ...empty(), profile: { name: "Петя", avatar: null, frame: "none" } });
  });
});
