import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, fromBackup, toBackup } from "./backup";
import { empty, withProfile, withResult, withRun, withXp } from "./storage";

const now = new Date("2026-03-04T05:06:07.000Z");
const filled = () =>
  withXp(
    withRun(
      withResult(withProfile(empty(), { name: "Маша", avatar: "fox-cub", frame: "sea" }), "c/t1", { outcome: "first", choices: [2], at: "2026-03-01T00:00:00.000Z" }),
      "c/l1",
      { cards: ["a", "b"], index: 1, phase: "solving", entries: [{ first: [1], final: { choices: [2], correct: true }, seen: true, opened: false }, { first: null, final: null, seen: false, opened: false }] },
    ),
    [{ id: "c/t1", points: 2 }],
  );

describe("toBackup", () => {
  it("marks the file with its format, version and date", () => {
    const backup = toBackup(empty(), now);
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: "2026-03-04T05:06:07.000Z" });
  });

  it("names the file by day", () => {
    expect(backupFileName(now)).toBe("repka-progress-2026-03-04.json");
  });
});

describe("fromBackup", () => {
  it("round-trips profile, results, lesson passes and experience", () => {
    const saved = filled();
    expect(saved.xp).toEqual({ "c/t1": 20 });
    const read = fromBackup(JSON.stringify(toBackup(saved, now)));
    expect(read).toEqual({ ok: true, saved, exportedAt: "2026-03-04T05:06:07.000Z" });
  });

  it("loads a version 1 file, which had no experience", () => {
    const { xp: _xp, ...old } = toBackup(filled(), now);
    const read = fromBackup(JSON.stringify({ ...old, version: 1 }));
    expect(read.ok && read.saved).toEqual({ ...filled(), xp: {} });
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
