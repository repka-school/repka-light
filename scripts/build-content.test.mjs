import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { basePath, buildContent, checkedHtml, textToHtml, THEORY_PICTURES } from "./build-content.mjs";
import { theoryPictureIds } from "../src/ui/pictures/TheoryPicture.tsx";

const courses = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "courses");
const temps = [];
const temp = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-"));
  temps.push(dir);
  return dir;
};
afterEach(() => temps.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

/** A one-task pack in a temporary directory; `task`, `lessonTasks` and `course` (the course file's text) override the valid defaults. */
function fixture({ task, lessonTasks = ["a/one"], course, files = {} } = {}) {
  const root = temp();
  const pack = path.join(root, "packs", "demo");
  fs.mkdirSync(path.join(pack, "tasks", "a"), { recursive: true });
  fs.mkdirSync(path.join(pack, "courses"), { recursive: true });
  fs.writeFileSync(path.join(root, "bundle.yaml"), "format: 6\npacks:\n  - demo\n");
  fs.writeFileSync(path.join(pack, "pack.yaml"), "id: demo\ntitle: Demo\n");
  fs.writeFileSync(path.join(pack, "courses", "demo.yaml"), course ?? `title: Demo\nmodules:\n  - slug: m\n    title: M\n    lessons:\n      - slug: l\n        title: L\n        tasks:\n${lessonTasks.map((t) => `          - ${t}`).join("\n")}\n`);
  fs.writeFileSync(
    path.join(pack, "tasks", "a", "one.yaml"),
    task ?? "status: active\nquestion:\n  text: Сколько?\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: один\n    - id: 2\n      text: два\n      correct: true\n",
  );
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(pack, name), text);
  return root;
}

/** A question's text: `options` as [id, text, right?] rows, then any `more` lines of the task. */
const question = (options, { kind = "single", hide = false, more = "" } = {}) =>
  `status: active\nquestion:\n  text: Q\nanswer:\n  kind: ${kind}\n${hide ? "  hide: true\n" : ""}  options:\n${options.map(([id, text, right]) => `    - id: ${id}\n      text: ${text}\n${right ? "      correct: true\n" : ""}`).join("")}${more}`;
const lessonOf = (slug) => `      - slug: ${slug}\n        title: L\n        tasks:\n          - a/one\n`;
/** The first card of the fixture's lesson, built. */
function builtCard(options) {
  const out = temp();
  buildContent({ root: fixture(options), out });
  return JSON.parse(fs.readFileSync(path.join(out, "demo.json"), "utf8")).modules[0].lessons[0].cards[0];
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

  it("leaves out what a question does not have", () => {
    expect(builtCard()).toMatchObject({ hideOptions: false, points: null, hint: null, explanation: null });
  });

  it("builds a question's points, hint and explanation, and that its options stay hidden", () => {
    const more = "points: 3\nlearning:\n  hint:\n    text: Подумай\nexplanation:\n  html: <p>Потому что <b>так</b></p>\n";
    expect(builtCard({ task: question([[1, "a", true], [2, "b"]], { hide: true, more }) })).toMatchObject({ hideOptions: true, points: 3, hint: "<p>Подумай</p>", explanation: "<p>Потому что <b>так</b></p>" });
  });

  it("builds a multi answer with every right option", () => {
    expect(builtCard({ task: question([[1, "a", true], [2, "b"], [3, "c", true]], { kind: "multi" }) })).toMatchObject({ answerKind: "multi", correct: [1, 3] });
  });

  it("escapes an option's text for the page and keeps it plain beside", () => {
    expect(builtCard({ task: question([[1, '"a < b"', true], [2, "b"]]) }).choices[0]).toEqual({ id: 1, label: "А", text: "a < b", html: "a &lt; b" });
  });

  it("builds the course index with each course's lessons and questions", () => {
    const index = buildContent({ root: fixture(), out: temp() });
    expect(index).toEqual({ courses: [{ slug: "demo", title: "Demo", description: "", cover: null, grades: [], lessons: 1, questions: ["demo/a/one"] }] });
  });

  it.each([
    ["an answer of a kind the site does not ask", { task: question([[1, "a", true], [2, "b"]], { kind: "text" }) }, /unknown answer kind text/],
    ["a question with one option", { task: question([[1, "a", true]]) }, /1 options/],
    ["a question with more options than letters", { task: question([1, 2, 3, 4, 5, 6, 7].map((id) => [id, "a", id === 1])) }, /7 options/],
    ["two options with one id", { task: question([[1, "a", true], [1, "b"]]) }, /repeated option id/],
    ["an option id that is not a whole number", { task: question([["a", "a", true], ["b", "b"]]) }, /option id that is not a whole number/],
    ["an option without text", { task: question([[1, "a", true], [2, '""']]) }, /an option without text/],
    ["a multi answer with no right option", { task: question([[1, "a"], [2, "b"]], { kind: "multi" }) }, /0 right options for a multi answer/],
    ["a question with nothing to show", { task: "status: active\nquestion:\n  text: ' '\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: a\n      correct: true\n    - id: 2\n      text: b\n" }, /nothing to show/],
    ["a lesson slug used twice in a course", { course: `title: Demo\nmodules:\n  - slug: m\n    title: M\n    lessons:\n${lessonOf("l")}  - slug: n\n    title: N\n    lessons:\n${lessonOf("l")}` }, /repeated lesson l/],
    ["a course without lessons", { course: "title: Demo\nmodules: []\n" }, /a course without lessons/],
    ["a pack whose file names another pack", { files: { "pack.yaml": "id: other\n" } }, /pack.yaml names the pack other/],
    ["a bundle without packs", { files: { "../../bundle.yaml": "format: 6\npacks: []\n" } }, /no courses to build/],
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

describe("two packs", () => {
  /** The fixture's pack, and a copy of it under another id. */
  function twoPacks(courseFile) {
    const root = fixture();
    fs.cpSync(path.join(root, "packs", "demo"), path.join(root, "packs", "more"), { recursive: true });
    fs.writeFileSync(path.join(root, "packs", "more", "pack.yaml"), "id: more\n");
    fs.renameSync(path.join(root, "packs", "more", "courses", "demo.yaml"), path.join(root, "packs", "more", "courses", courseFile));
    fs.writeFileSync(path.join(root, "bundle.yaml"), "format: 6\npacks:\n  - demo\n  - more\n");
    return root;
  }

  it("build into one index, each task under its own pack", () => {
    const index = buildContent({ root: twoPacks("other.yaml"), out: temp() });
    expect(index.courses.map((c) => [c.slug, c.questions])).toEqual([["demo", ["demo/a/one"]], ["other", ["more/a/one"]]]);
  });

  it("are refused when their courses share a slug", () => {
    expect(() => buildContent({ root: twoPacks("demo.yaml"), out: temp() })).toThrow(/two courses share a slug/);
  });
});

describe("a theory card", () => {
  const head = "kind: theory\nstatus: active\nlearning:\n  title: T\n";
  /** The first card of a lesson that goes on to the fixture's question. */
  const built = (theory) => {
    const out = temp();
    buildContent({ root: fixture({ lessonTasks: ["a/theory", "a/one"], files: { "tasks/a/theory.yaml": theory } }), out });
    return JSON.parse(fs.readFileSync(path.join(out, "demo.json"), "utf8")).modules[0].lessons[0].cards[0];
  };

  it("keeps a plain body and has no blocks", () => {
    expect(built(`${head}question:\n  text: Читай\n`)).toEqual({ id: "demo/a/theory", kind: "theory", title: "T", body: "<p>Читай</p>", blocks: [] });
  });

  it("builds blocks alone, with an empty body", () => {
    const blocks = [
      "blocks:",
      "  - kind: says",
      "    text: Привет",
      "  - kind: steps",
      "    items:",
      "      - picture: book",
      "        title: Читай",
      "        text: Два раза",
      "  - kind: tiles",
      "    items:",
      "      - picture: pencil",
      "        title: Рисуй",
      "  - kind: try",
      "    text: Сколько?",
      "    answer: Два",
      "  - kind: tip",
      "    picture: cup",
      "    text: Отдохни",
    ].join("\n");
    expect(built(`${head}${blocks}\n`)).toMatchObject({
      body: "",
      blocks: [
        { kind: "says", text: "Привет" },
        { kind: "steps", title: "", items: [{ picture: "book", title: "Читай", text: "Два раза" }] },
        { kind: "tiles", title: "", items: [{ picture: "pencil", title: "Рисуй", text: "" }] },
        { kind: "try", title: "", text: "Сколько?", answer: "Два", picture: null },
        { kind: "tip", picture: "cup", text: "Отдохни" },
      ],
    });
  });

  it.each([
    ["with neither a body nor blocks", "", /nothing to show/],
    ["with a block of an unknown kind", "blocks:\n  - kind: video\n    text: x\n", /unknown kind video/],
    ["with a picture the site does not draw", "blocks:\n  - kind: tip\n    picture: dragon\n    text: x\n", /unknown picture dragon/],
    ["with steps that have no items", "blocks:\n  - kind: steps\n    items: []\n", /has no items/],
    ["with a picture file the pack lacks", "blocks:\n  - kind: image\n    file: images/none.png\n", /missing picture images\/none.png/],
    ["with a riddle that has no answer", "blocks:\n  - kind: try\n    text: Сколько?\n", /answer of block 1 \(try\) is empty/],
  ])("is refused %s", (_, blocks, message) => {
    expect(() => built(`${head}${blocks}`)).toThrow(message);
  });

  it("may name exactly the pictures the site draws", () => {
    expect([...THEORY_PICTURES].sort()).toEqual([...theoryPictureIds].sort());
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

  it("keeps the attributes a table cell may have", () => {
    const table = '<table><tr><td colspan="2" rowspan="2">1</td></tr></table>';
    expect(checkedHtml(table, "t")).toBe(`<div class="scroll-frame">${table}</div>`);
  });

  it("refuses a \"<\" that opens no whole tag", () => {
    expect(() => checkedHtml("<p>a < b</p>", "t")).toThrow(/stray "<"/);
    expect(() => checkedHtml("<p>a</p><!-- note -->", "t")).toThrow(/stray "<"/);
    // A tag never closed would swallow whatever the page puts after it.
    expect(() => checkedHtml("<p>a</p><img src=x onerror=alert(1) ", "t")).toThrow(/stray "<"/);
    expect(() => checkedHtml("<p <script>alert(1)</script>", "t")).toThrow(/<script> is not allowed/);
  });

  it("refuses markup in a task that uses it", () => {
    const task = "status: active\nquestion:\n  html: <p onclick=\"x()\">Q</p>\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: a\n      correct: true\n    - id: 2\n      text: b\n";
    expect(() => buildContent({ root: fixture({ task }), out: temp() })).toThrow(/demo\/a\/one: attribute onclick/);
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
