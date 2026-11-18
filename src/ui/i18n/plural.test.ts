import { describe, expect, it } from "vitest";
import { count, plural } from "./plural";

const tasks = ["задание", "задания", "заданий"] as const;

describe("plural", () => {
  it("takes the form a Russian number asks for", () => {
    expect([1, 21, 101, 1001].map((n) => plural(n, tasks))).toEqual(["задание", "задание", "задание", "задание"]);
    expect([2, 3, 4, 22, 34, 103].map((n) => plural(n, tasks))).toEqual(["задания", "задания", "задания", "задания", "задания", "задания"]);
    expect([0, 5, 9, 10, 20, 25, 100].map((n) => plural(n, tasks))).toEqual(["заданий", "заданий", "заданий", "заданий", "заданий", "заданий", "заданий"]);
  });

  it("takes the last form from 11 to 19, in any hundred", () => {
    for (const n of [11, 12, 13, 14, 15, 19, 111, 112, 214, 1011]) expect(plural(n, tasks)).toBe("заданий");
  });

  it("goes by the whole part, whatever the sign", () => {
    expect(plural(-1, tasks)).toBe("задание");
    expect(plural(2.7, tasks)).toBe("задания");
  });
});

describe("count", () => {
  it("puts the number before its word", () => {
    expect([1, 3, 12].map((n) => count(n, tasks))).toEqual(["1 задание", "3 задания", "12 заданий"]);
  });
});
