import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, fromBackup, toBackup } from "./backup";
import { apply, starter } from "@/homestead/rules";
import { pack } from "@/homestead/saved";
import { cardsKey, empty, withPractice, withProfile, withResult, withRun, withXp, type Saved } from "./storage";

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
  it("round-trips profile, results, lesson passes and experience", () => {
    const saved = filled();
    expect(saved.xp).toEqual({ "c/t1": 20 });
    const read = fromBackup(JSON.stringify(toBackup(saved, now)));
    expect(read).toEqual({ ok: true, saved, exportedAt: "2026-03-04T05:06:07.000Z" });
  });

  it("keeps the state in the short form, grouped by course", () => {
    const backup = toBackup(filled(), now);
    expect(backup.courses.c).toMatchObject({ last: "2026-03-01T00:00:00.000Z", results: { t1: ["f", 2] }, xp: { t1: 20 } });
    expect("results" in backup).toBe(false);
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

  it("cleans what it loads like anything stored", () => {
    const read = fromBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, profile: { name: "  Петя ", avatar: "dragon" }, results: { x: { outcome: "great" } } }));
    expect(read.ok && read.saved).toEqual({ ...empty(), profile: { name: "Петя", avatar: null, frame: "none" } });
  });
});
