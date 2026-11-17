import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { basePath, buildContent, checkedHtml, textToHtml } from "./build-content.mjs";

const courses = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "courses");
const temps = [];
const temp = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-"));
  temps.push(dir);
  return dir;
};
afterEach(() => temps.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

/** A one-task pack in a temporary directory; `task` and `lessonTasks` override the valid defaults. */
function fixture({ task, lessonTasks = ["a/one"], files = {} } = {}) {
  const root = temp();
  const pack = path.join(root, "packs", "demo");
  fs.mkdirSync(path.join(pack, "tasks", "a"), { recursive: true });
  fs.mkdirSync(path.join(pack, "courses"), { recursive: true });
  fs.writeFileSync(path.join(root, "bundle.yaml"), "format: 6\npacks:\n  - demo\n");
  fs.writeFileSync(path.join(pack, "pack.yaml"), "id: demo\ntitle: Demo\n");
  fs.writeFileSync(path.join(pack, "courses", "demo.yaml"), `title: Demo\nmodules:\n  - slug: m\n    title: M\n    lessons:\n      - slug: l\n        title: L\n        tasks:\n${lessonTasks.map((t) => `          - ${t}`).join("\n")}\n`);
  fs.writeFileSync(
    path.join(pack, "tasks", "a", "one.yaml"),
    task ?? "status: active\nquestion:\n  text: Сколько?\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: один\n    - id: 2\n      text: два\n      correct: true\n",
  );
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(pack, name), text);
  return root;
}

describe("the bundled courses", () => {
  it("build into an index and one file per course, with nothing internal left in", () => {
    const out = temp();
    const index = buildContent({ root: courses, out });
    expect(index.courses.length).toBeGreaterThan(0);
    for (const summary of index.courses) {
      const text = fs.readFileSync(path.join(out, `${summary.slug}.json`), "utf8");
      const course = JSON.parse(text);
      const questions = course.modules.flatMap((m) => m.lessons).flatMap((l) => l.cards).filter((c) => c.kind === "question");
      expect(questions.map((q) => q.id)).toEqual(summary.questions);
      expect(text).not.toMatch(/"note"|"classification"|"origin"/);
      for (const src of text.matchAll(/src=\\"([^"\\]+)\\"/g)) expect(fs.existsSync(path.join(out, src[1].replace(/^\/content\//, "")))).toBe(true);
      if (course.cover) expect(fs.existsSync(path.join(out, course.cover.replace(/^\/content\//, "")))).toBe(true);
    }
  });
});

describe("a pack", () => {
  it("builds a question with lettered options and its right answer", () => {
    const out = temp();
    buildContent({ root: fixture(), out });
    const [card] = JSON.parse(fs.readFileSync(path.join(out, "demo.json"), "utf8")).modules[0].lessons[0].cards;
    expect(card).toMatchObject({ id: "demo/a/one", kind: "question", answerKind: "single", correct: [2], body: "<p>Сколько?</p>" });
    expect(card.choices.map((c) => c.label)).toEqual(["А", "Б"]);
  });

  it.each([
    ["a task the lesson names but the pack lacks", { lessonTasks: ["a/one", "a/missing"] }, /missing task a\/missing/],
    ["a question with no right option", { task: "status: active\nquestion:\n  text: Q\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: a\n    - id: 2\n      text: b\n" }, /0 right options/],
    ["a single answer with two right options", { task: "status: active\nquestion:\n  text: Q\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: a\n      correct: true\n    - id: 2\n      text: b\n      correct: true\n" }, /2 right options/],
    ["a picture that is not in the pack", { task: "status: active\nquestion:\n  text: Q\n  images:\n    - file: images/none.png\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: a\n      correct: true\n    - id: 2\n      text: b\n" }, /missing picture/],
    ["a task that is not active", { task: "status: draft\nquestion:\n  text: Q\n" }, /not active/],
    ["a lesson of theory only", { task: "kind: theory\nstatus: active\nquestion:\n  text: T\n" }, /without questions/],
  ])("refuses %s", (_, options, message) => {
    expect(() => buildContent({ root: fixture(options), out: temp() })).toThrow(message);
  });
});

describe("rebuilding into the same directory", () => {
  it("leaves unchanged files untouched and removes only what is no longer built", () => {
    const out = temp();
    buildContent({ root: fixture(), out });
    const kept = path.join(out, "demo.json");
    const stale = path.join(out, "media", "old", "gone.png");
    fs.mkdirSync(path.dirname(stale), { recursive: true });
    fs.writeFileSync(stale, "x");
    const long = new Date(2000, 0, 1);
    fs.utimesSync(kept, long, long);

    buildContent({ root: fixture(), out });
    expect(fs.statSync(kept).mtime).toEqual(long);
    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(path.join(out, "media"))).toBe(false);
    expect(fs.readdirSync(out).sort()).toEqual(["demo.json", "index.json"]);
  });

  it("rewrites a file whose content changed", () => {
    const out = temp();
    buildContent({ root: fixture(), out });
    const changed = "status: active\nquestion:\n  text: Иначе?\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: один\n      correct: true\n    - id: 2\n      text: два\n";
    buildContent({ root: fixture({ task: changed }), out });
    expect(fs.readFileSync(path.join(out, "demo.json"), "utf8")).toContain("Иначе?");
  });
});

describe("markup", () => {
  it("escapes plain text and keeps its line breaks", () => {
    expect(textToHtml("a < b\nc & d\n")).toBe("<p>a &lt; b<br>c &amp; d</p>");
  });

  it("frames a table and refuses tags and attributes outside the allowed set", () => {
    expect(checkedHtml("<p>x</p><table><tr><td>1</td></tr></table>", "t")).toBe('<p>x</p><div class="scroll-frame"><table><tr><td>1</td></tr></table></div>');
    expect(() => checkedHtml("<script>alert(1)</script>", "t")).toThrow(/<script> is not allowed/);
    expect(() => checkedHtml('<p onclick="x()">a</p>', "t")).toThrow(/attribute onclick/);
    expect(() => checkedHtml('<a href="https://example.com">a</a>', "t")).toThrow(/<a> is not allowed/);
  });
});

describe("the base path", () => {
  it("has a slash at each end, whatever was given", () => {
    expect([undefined, "", "/", "/site", "site/", "/a/b/"].map(basePath)).toEqual(["/", "/", "/", "/site/", "/site/", "/a/b/"]);
  });

  it("starts every picture address", () => {
    const out = temp();
    const index = buildContent({ root: courses, out, base: "/site/" });
    const covers = index.courses.map((course) => course.cover).filter(Boolean);
    expect(covers.length).toBeGreaterThan(0);
    for (const cover of covers) expect(cover.startsWith("/site/content/media/")).toBe(true);
    for (const { slug } of index.courses) {
      const text = fs.readFileSync(path.join(out, `${slug}.json`), "utf8");
      for (const [, src] of text.matchAll(/src=\\"([^"\\]+)/g)) expect(src.startsWith("/site/content/media/")).toBe(true);
    }
  });
});
