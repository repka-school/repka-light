import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { basePath, buildContent, textToHtml, THEORY_PICTURES } from "./build-content.mjs";
import { parseMarkup, renderMarkup } from "./content-markup.mjs";
import { theoryPictureIds } from "../src/ui/pictures/TheoryPicture.tsx";
import { DRILL_ROUNDS, drillQuestions } from "../src/lesson/drill";

const courses = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "courses");
const checkedHtml = (source, where) => renderMarkup(parseMarkup(source, where), { where }).html;
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

  it("publishes replayable algebra lessons with symbolic answers and exact roots", () => {
    const out = temp();
    const index = buildContent({ root: courses, out });
    const course = JSON.parse(fs.readFileSync(path.join(out, "mental-algebra.json"), "utf8"));
    const lessons = course.modules.flatMap((module) => module.lessons);
    const summary = index.courses.find(({ slug }) => slug === course.slug);
    expect(summary.grades).toEqual(["7", "8"]);
    expect(summary.drills).toEqual(lessons.map(({ cards }) => cards[1].id));

    for (const { cards: [theory, drill] } of lessons) {
      const pool = [...drill.facts, ...drill.alternateFacts];
      expect(new Set(pool.map(({ prompt }) => prompt)).size).toBe(pool.length);
      const game = drillQuestions(drill);
      expect(game).toHaveLength(DRILL_ROUNDS);
      for (const family of [drill.facts, drill.alternateFacts]) {
        const prompts = new Set(family.map(({ prompt }) => prompt));
        expect(prompts.size).toBeGreaterThan(DRILL_ROUNDS / 2);
        expect(game.filter(({ prompt }) => prompts.has(prompt))).toHaveLength(DRILL_ROUNDS / 2);
      }
      for (const { options, answer } of game) {
        const labels = options.map((value) => drill.answerLabels ? drill.answerLabels[value] : value);
        expect(labels).not.toContain(undefined);
        expect(new Set(labels).size).toBe(3);
        expect(options).toContain(answer);
      }
      for (const { prompt, answer } of drill.facts) {
        if (drill.equation) {
          const [, factor, sign, offset, right] = prompt.match(/^(\d+)x(?: ([+−]) (\d+))? = (−?\d+)$/);
          expect(Number(factor) * answer + (sign === "−" ? -1 : 1) * Number(offset ?? 0)).toBe(Number(right.replace("−", "-")));
        } else if (prompt.startsWith("√")) {
          const [radicand, divisor = "1"] = prompt.slice(1).split("/");
          expect(answer * Number(divisor)).toBe(Math.sqrt(Number(radicand.replace(/[()]/g, ""))));
        }
      }
      expect(theory.body).toContain("<p>");
    }

    for (const [slug, prompt, value, label] of [
      ["cancel-factors", "(x·4)/2", 2, "2x"],
      ["cancel-factors", "(x·3·6)/3", 6, "6x"],
      ["like-terms", "3x − 5x", -2, "−2x"],
      ["like-terms", "3x − (x + 5x)", -3, "−3x"],
      ["square-roots", "√(4·9)", 6, "6"],
      ["root-quotients", "√(4)/2", 1, "1"],
      ["root-quotients", "8/√(4)", 4, "4"],
      ["one-step", "2x = 8", 4, "x = 4"],
      ["one-step", "2 = x − 2", 4, "x = 4"],
      ["two-step", "3x + 2 = 14", 4, "x = 4"],
      ["two-step", "3(x + 2) = 18", 4, "x = 4"],
    ]) {
      const drill = lessons.find((lesson) => lesson.slug === slug).cards[1];
      expect([...drill.facts, ...drill.alternateFacts]).toContainEqual(expect.objectContaining({ prompt, answer: value }));
      expect(drill.answerLabels?.[value] ?? String(value)).toBe(label);
    }
  });

  it("builds arithmetic tables and games whose examples fit each lesson", () => {
    const out = temp();
    const index = buildContent({ root: courses, out });
    for (const [slug, lessonCount] of [["addition", 4], ["subtraction", 4], ["division", 9], ["addition-subtraction", 4]]) {
      const course = JSON.parse(fs.readFileSync(path.join(out, `${slug}.json`), "utf8"));
      const lessons = course.modules.flatMap((module) => module.lessons);
      expect(lessons).toHaveLength(lessonCount);
      const gameIds = [];
      for (const [lessonIndex, { cards }] of lessons.entries()) {
        expect(cards.map((card) => card.kind)).toEqual(["theory", "drill"]);
        const [theory, drill] = cards;
        gameIds.push(drill.id);
        const facts = [...drill.facts, ...(drill.alternateFacts ?? [])];
        const tableRows = [...theory.body.matchAll(/<th scope="row">([^<]+)<\/th><td>(\d+)<\/td>/g)];
        expect(tableRows.length).toBeGreaterThan(0);
        for (const [, prompt, answer] of tableRows) expect(facts).toContainEqual({ prompt, answer: Number(answer) });
        for (const { prompt, answer } of facts) {
          const [a, sign, b] = prompt.split(" ");
          const left = Number(a);
          const right = Number(b);
          if (slug === "division") {
            expect(sign).toBe("÷");
            expect(right).toBe(lessonIndex + 2);
            expect(answer).toBeGreaterThanOrEqual(1);
            expect(answer).toBeLessThanOrEqual(10);
            expect(left).toBe(right * answer);
          } else {
            expect(sign).toMatch(/^[+−]$/);
            expect(answer).toBe(sign === "+" ? left + right : left - right);
            expect(answer).toBeGreaterThanOrEqual(0);
            const limit = [10, 20, 100, 100][lessonIndex];
            expect(Math.max(left, right, answer)).toBeLessThanOrEqual(limit);
            if (limit === 100) {
              const crossing = sign === "+" ? left % 10 + right % 10 >= 10 : left % 10 < right % 10;
              expect(crossing).toBe(lessonIndex === 3);
            }
          }
        }
        const game = drillQuestions(drill);
        expect(game).toHaveLength(DRILL_ROUNDS);
        expect(new Set(game.map((question) => question.prompt)).size).toBe(DRILL_ROUNDS);
        for (const { answer, options } of game) {
          expect(new Set(options).size).toBe(3);
          expect(options).toContain(answer);
        }
        if (slug === "addition-subtraction") {
          expect(game.filter(({ prompt }) => prompt.includes(" + "))).toHaveLength(5);
          expect(game.filter(({ prompt }) => prompt.includes(" − "))).toHaveLength(5);
        }
      }
      expect(index.courses.find((summary) => summary.slug === slug).drills).toEqual(gameIds);
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

  it("keeps inline pictures in place and appends the remaining pictures", () => {
    const task = question([[1, "a", true], [2, "b"]], {
      more: `explanation:
  html: |-
    <p>Before</p><p><img src="images/graph.png" alt='Vertices "A" &amp; B'></p><p>After</p>
  images:
    - file: images/graph.png
    - file: images/extra.png
      alt: Extra graph
`,
    });
    const root = fixture({ task });
    const images = path.join(root, "packs", "demo", "images");
    fs.mkdirSync(images);
    for (const file of ["graph.png", "extra.png"]) fs.writeFileSync(path.join(images, file), file);
    const out = temp();
    buildContent({ root, out, base: "/site/" });
    const [card] = JSON.parse(fs.readFileSync(path.join(out, "demo.json"), "utf8")).modules[0].lessons[0].cards;
    expect(card.explanation).toBe(
      '<p>Before</p><p><img src="/site/content/media/demo/images/graph.png" alt="Vertices &quot;A&quot; &amp; B" loading="lazy"></p><p>After</p>' +
      '<img src="/site/content/media/demo/images/extra.png" alt="Extra graph" loading="lazy">',
    );
    expect(fs.readdirSync(path.join(out, "media", "demo", "images")).sort()).toEqual(["extra.png", "graph.png"]);
  });

  it("builds a multi answer with every right option", () => {
    expect(builtCard({ task: question([[1, "a", true], [2, "b"], [3, "c", true]], { kind: "multi" }) })).toMatchObject({ answerKind: "multi", correct: [1, 3] });
  });

  it("escapes an option's text for the page and keeps it plain beside", () => {
    expect(builtCard({ task: question([[1, '"a < b"', true], [2, "b"]]) }).choices[0]).toEqual({ id: 1, label: "А", text: "a < b", html: "a &lt; b" });
  });

  it("lifts Repka's formatted options by label, preserving reordered ids and inline formulas", () => {
    const formula = '<math display="block"><semantics><mfrac><mn>1</mn><mn>2</mn></mfrac><annotation encoding="application/x-tex">source</annotation></semantics></math>';
    const card = builtCard({ task: JSON.stringify({
      status: "active",
      question: { html: `<p>Сравни.</p><p><strong>A)</strong>&nbsp;${formula}</p><p><b>Б)</b> x<sup>2</sup></p>` },
      answer: { kind: "single", hide: true, options: [{ id: 9, label: "Б", text: "x2" }, { id: 3, label: "А", text: "1 / 2", correct: true }] },
      learning: { hint: { html: formula } },
      explanation: { html: "<div><span><u>Числитель</u></span><hr><s>Делитель</s></div>" },
    }) });
    expect(card).toMatchObject({
      body: "<p>Сравни.</p>",
      correct: [3],
      hideOptions: true,
      choices: [
        { id: 9, label: "Б", text: "x2", html: "x<sup>2</sup>" },
        { id: 3, label: "А", text: "1/2", html: `<span class="formula">${formula.replace(' display="block"', "")}</span>` },
      ],
      hint: formula,
      explanation: "<div><span><u>Числитель</u></span><hr><s>Делитель</s></div>",
    });
  });

  it("keeps unliftable option lines in the question and gives the tiles letters", () => {
    const html = "<p>Выбери.</p><p>А) 1 Б) 2</p>";
    const task = {
      status: "active",
      question: { html },
      answer: { kind: "single", options: [{ id: 1, text: "1", correct: true }, { id: 2, text: "2" }] },
    };
    expect(builtCard({ task: JSON.stringify(task) })).toMatchObject({
      body: html, choices: [{ label: "А", text: "", html: "" }, { label: "Б", text: "", html: "" }],
    });
    task.answer.hide = true;
    expect(() => builtCard({ task: JSON.stringify(task) })).toThrow(/options cannot be hidden/);
  });

  it("places a Repka answer picture by its original URL and writes its local copy once", () => {
    const task = {
      status: "active",
      source: { url: "https://example.test/contest/problem" },
      question: { html: '<p>Выбери рисунок.</p><img width="32" src="/photos/choices.gif"><p>Продолжение.</p>' },
      answer: {
        kind: "multi", picture: { file: "options.png", original_url: "https://example.test/photos/choices.gif" },
        options: [{ id: 5, label: "Б", correct: true }, { id: 1, label: "А" }],
      },
      explanation: {},
    };
    const out = temp();
    const root = fixture({ task: JSON.stringify(task), files: { "options.png": "local image" } });
    buildContent({ root, out, base: "/site/" });
    const [card] = JSON.parse(fs.readFileSync(path.join(out, "demo.json"), "utf8")).modules[0].lessons[0].cards;
    expect(card).toMatchObject({
      body: '<p>Выбери рисунок.</p><img src="/site/content/media/demo/options.png" alt="Изображение вариантов ответа А–Б" loading="lazy"><p>Продолжение.</p>',
      answerKind: "multi", correct: [5], hideOptions: false, explanation: null,
      choices: [{ id: 5, label: "Б", text: "", html: "" }, { id: 1, label: "А", text: "", html: "" }],
    });
    expect(fs.readFileSync(path.join(out, "media", "demo", "options.png"), "utf8")).toBe("local image");
    task.answer.hide = true;
    expect(() => builtCard({ task: JSON.stringify(task) })).toThrow(/options cannot be hidden/);
    task.answer.hide = false;
    task.answer.options[0].text = "extra";
    expect(() => builtCard({ task: JSON.stringify(task) })).toThrow(/text beside an answer picture/);
  });

  it("imports course files with top-level lessons and skips voided questions", () => {
    const course = "title: Demo\nlessons:\n  - slug: exam\n    title: Exam\n    tasks: [a/voided, a/one]\n";
    const out = temp();
    const root = fixture({ course, files: { "tasks/a/voided.yaml": "status: voided" } });
    expect(buildContent({ root, out }).courses[0]).toMatchObject({ lessons: 1, questions: ["demo/a/one"] });
    const [{ lessons }] = JSON.parse(fs.readFileSync(path.join(out, "demo.json"), "utf8")).modules;
    expect(lessons[0]).toMatchObject({ slug: "exam", title: "Exam" });
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
    ["an inline picture without an image reference", { task: question([[1, "a", true], [2, "b"]], { more: 'explanation:\n  html: <img src="images/missing.png">\n' }) }, /missing from images/],
    ["a lesson whose only question is a draft", { task: "status: draft\nquestion:\n  text: Q\n" }, /without questions/],
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

  it("resolves a flat course's cross-pack question using the question's media", () => {
    const root = twoPacks("other.yaml");
    fs.writeFileSync(path.join(root, "packs", "demo", "courses", "demo.yaml"), "title: Demo\ntasks: [more:a:one]\n");
    fs.writeFileSync(path.join(root, "packs", "more", "tasks", "a", "one.yaml"), question([[1, "a", true], [2, "b"]], {
      more: "explanation:\n  images: [{file: graph.png}]\n",
    }));
    fs.writeFileSync(path.join(root, "packs", "more", "graph.png"), "picture");
    const out = temp();
    expect(buildContent({ root, out }).courses[0]).toMatchObject({ lessons: 1, questions: ["more/a/one"] });
    const [lesson] = JSON.parse(fs.readFileSync(path.join(out, "demo.json"), "utf8")).modules[0].lessons;
    expect(lesson.cards[0].explanation).toContain('src="/content/media/more/graph.png"');
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

  it("frames a table and rebuilds HTML using Repka's allowed tags and attributes", () => {
    expect(checkedHtml('<script>alert(1)</script><p style="color:red"><a href="/a">x</a></p><table border="1"><tr><td>1</td></tr></table>', "t")).toBe(
      '<p>x</p><div class="scroll-frame"><table><tbody><tr><td>1</td></tr></tbody></table></div>',
    );
  });

  it("keeps the attributes a table cell may have", () => {
    const table = '<table><tbody><tr><td colspan="2" rowspan="2">1</td></tr></tbody></table>';
    expect(checkedHtml(table, "t")).toBe(`<div class="scroll-frame">${table}</div>`);
  });

  it("keeps additional HTML tags and applies a MathML table's alignment and lines to its cells", () => {
    const html = '<div><span><u>Underline</u> <s>Strike</s></span><hr><table><tfoot><tr><td>Total</td></tr></tfoot></table></div>';
    expect(checkedHtml(html, "t")).toBe(html.replace("<table>", '<div class="scroll-frame"><table>').replace("</table>", "</table></div>"));
    const table = '<math display="block"><mtable columnalign="right left" columnlines="solid"><mtr><mtd><mi>x</mi></mtd><mtd><mn>1</mn></mtd></mtr></mtable></math>';
    expect(checkedHtml(table, "t")).toContain('<mtd columnalign="right"><mi>x</mi></mtd><mtd columnalign="left" class="ml-l-solid"><mn>1</mn></mtd>');
  });

  it.each([
    ["a MathML token outside a formula", "<mi>x</mi>"],
    ["a nested formula", "<math><math><mi>x</mi></math></math>"],
    ["an HTML integration point", "<math><mtext><strong>x</strong></mtext></math>"],
    ["HTML that closes the formula early", "<math><div>x</div></math>"],
    ["an unsupported MathML element", "<math><annotation-xml>source</annotation-xml></math>"],
    ["an unsupported attribute", '<math><mi href="https://example.test/">x</mi></math>'],
    ["an unsupported attribute value", '<math><mi mathvariant="double-struck">R</mi></math>'],
    ["an annotation of the wrong encoding", '<math><annotation encoding="text/html">source</annotation></math>'],
  ])("refuses %s with the source location", (_, source) => {
    expect(() => checkedHtml(source, "pack/task explanation")).toThrow(/pack\/task explanation:/);
  });

  it("keeps a definition blockquote and strips its attributes", () => {
    const definition = "<blockquote><p><strong>Определение.</strong> Степень вершины.</p></blockquote>";
    expect(checkedHtml(definition, "t")).toBe(definition);
    expect(checkedHtml('<blockquote cite="/a"><p>Definition</p></blockquote>', "t")).toBe("<blockquote><p>Definition</p></blockquote>");
  });

  it("escapes a literal comparison, strips comments, and reports incomplete tags", () => {
    expect(checkedHtml("<p>a < b</p><!-- note -->", "t")).toBe("<p>a &lt; b</p>");
    // A tag never closed would swallow whatever the page puts after it.
    expect(() => checkedHtml("<p>a</p><img src=x onerror=alert(1) ", "t")).toThrow(/stray "<"/);
  });

  it("strips active attributes from authored task HTML", () => {
    const task = "status: active\nquestion:\n  html: <p onclick=\"x()\">Q</p>\nanswer:\n  kind: single\n  options:\n    - id: 1\n      text: a\n      correct: true\n    - id: 2\n      text: b\n";
    expect(builtCard({ task }).body).toBe("<p>Q</p>");
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
