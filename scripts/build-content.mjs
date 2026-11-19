// Turns the course packs under courses/ into the JSON and pictures the site
// loads: public/content/index.json, one file per course, and media/.
// Fails on anything a lesson could not show: a missing task or picture, a
// question without a right answer, markup outside the small allowed set.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];
const IMAGE_ALT = "Иллюстрация к заданию";
const ALLOWED_TAGS = new Set(["p", "br", "blockquote", "b", "strong", "i", "em", "sub", "sup", "ul", "ol", "li", "table", "caption", "thead", "tbody", "tr", "th", "td"]);
const ALLOWED_ATTRIBUTES = new Set(["colspan", "rowspan"]);
/** The drawings a theory block may name; the site draws each one (src/ui/pictures/TheoryPicture.tsx). */
export const THEORY_PICTURES = [
  "book", "reread", "question", "magnifier", "check", "pencil", "list", "counters", "cup", "corner", "plus", "minus", "plusminus", "brackets", "letter",
  "zero", "two", "four", "roman", "arrow", "swap", "rewind", "table", "shield", "mask", "bulb", "venn-left", "venn-both", "venn-right", "venn-out",
  "pattern", "cells", "pairs", "odd", "tree", "pair", "bag", "chicken", "rabbit", "grid-small", "grid-big", "scissors", "equal", "shapes", "sticks",
  "medal", "talk", "posts", "log", "bell", "cake", "people", "boat", "jug-full", "jug-empty", "jug-pour", "scales", "clock", "calendar", "stones",
  "sudoku", "domino", "coords", "key", "graph", "cube", "net", "blocks", "rook", "bishop", "knight", "tangram", "pentomino", "mirror",
];

const readYaml = (file) => parse(fs.readFileSync(file, "utf8"));

export const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text as one paragraph, its line breaks kept. */
export const textToHtml = (text) => `<p>${escapeHtml(text.trim()).replace(/\n/g, "<br>")}</p>`;

/** Authored markup, checked against the allowed tags; a table gets a frame that scrolls when it is too wide. */
export function checkedHtml(html, where, renderImage) {
  const tags = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^<>]*)>/g;
  const checked = html.replace(tags, (markup, closing, tag, attributes) => {
    if (tag.toLowerCase() === "img" && !closing && renderImage) {
      const ref = /^\s+src\s*=\s*(?:"([^"]+)"|'([^']+)')(?:\s+alt\s*=\s*(?:"([^"]*)"|'([^']*)'))?\s*\/?\s*$/.exec(attributes);
      if (!ref) throw new Error(`${where}: expected an image with src and optional alt`);
      return renderImage(ref[1] ?? ref[2], ref[3] ?? ref[4]);
    }
    if (!ALLOWED_TAGS.has(tag.toLowerCase())) throw new Error(`${where}: tag <${tag}> is not allowed`);
    if (!closing) {
      for (const [, name] of attributes.matchAll(/([a-zA-Z-]+)\s*=/g)) {
        if (!ALLOWED_ATTRIBUTES.has(name.toLowerCase())) throw new Error(`${where}: attribute ${name} is not allowed on <${tag}>`);
      }
    }
    return markup;
  });
  // Whatever "<" is left opens no whole tag: a bare sign, or a tag that is never closed.
  if (html.replace(tags, "").includes("<")) throw new Error(`${where}: a stray "<" in markup`);
  return checked.replace(/<table[\s\S]*?<\/table>/g, (table) => `<div class="scroll-frame">${table}</div>`);
}

/**
 * A theory card's blocks, checked: what the guide says, numbered steps, facts,
 * a row of tiles, a picture of the pack, a riddle with a hidden answer, a tip.
 * Their text is plain. `image` turns a picture's file into its address.
 */
export function theoryBlocks(blocks, where, image) {
  if (blocks === undefined) return [];
  if (!Array.isArray(blocks) || blocks.length === 0) throw new Error(`${where}: blocks is not a list of blocks`);
  const text = (value, what) => {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${where}: ${what} is empty`);
    return value.trim();
  };
  const optional = (value, what) => (value === undefined ? "" : text(value, what));
  const picture = (name, what) => {
    if (!THEORY_PICTURES.includes(name)) throw new Error(`${where}: ${what} names an unknown picture ${name}`);
    return name;
  };
  const items = (list, what) => {
    if (!Array.isArray(list) || list.length === 0) throw new Error(`${where}: ${what} has no items`);
    return list.map((item, i) => ({
      picture: picture(item?.picture, `${what} item ${i + 1}`),
      title: text(item?.title, `the title of ${what} item ${i + 1}`),
      text: optional(item?.text, `the text of ${what} item ${i + 1}`),
    }));
  };
  return blocks.map((block, i) => {
    const what = `block ${i + 1} (${block?.kind})`;
    switch (block?.kind) {
      case "says":
        return { kind: "says", text: text(block.text, what) };
      case "steps":
      case "facts":
      case "tiles":
        return { kind: block.kind, title: optional(block.title, `the title of ${what}`), items: items(block.items, what) };
      case "image":
        return { kind: "image", html: `<img src="${image(text(block.file, `the file of ${what}`), where)}" alt="${escapeHtml(block.alt ?? IMAGE_ALT)}" loading="lazy">` };
      case "try":
        return {
          kind: "try",
          title: optional(block.title, `the title of ${what}`),
          text: text(block.text, what),
          answer: text(block.answer, `the answer of ${what}`),
          picture: block.picture === undefined ? null : picture(block.picture, what),
        };
      case "tip":
        return { kind: "tip", picture: picture(block.picture, what), text: text(block.text, what) };
      default:
        throw new Error(`${where}: block ${i + 1} has an unknown kind ${block?.kind}`);
    }
  });
}

/**
 * Writes into the output directory in place and remembers what it wrote. A
 * file whose bytes are unchanged is left alone, and nothing is deleted until
 * `sweep`, which removes only what this build no longer produces. The
 * directory is never emptied first: a dev server watching it would lose
 * track of files that vanish and reappear.
 */
function writer(out) {
  const written = new Set();
  const put = (relative, data) => {
    const target = path.join(out, relative);
    written.add(path.resolve(target));
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (fs.existsSync(target) && fs.readFileSync(target).equals(bytes)) return;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  };
  const sweep = (dir = out) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        sweep(full);
        if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
      } else if (!written.has(path.resolve(full))) {
        fs.rmSync(full);
      }
    }
  };
  return { put, sweep };
}

function buildPack(root, put, packId, base) {
  const packDir = path.join(root, "packs", packId);
  const pack = readYaml(path.join(packDir, "pack.yaml"));
  if (pack.id !== packId) throw new Error(`${packId}: pack.yaml names the pack ${pack.id}`);
  const media = new Set();

  const image = (file, where) => {
    if (!fs.existsSync(path.join(packDir, file))) throw new Error(`${where}: missing picture ${file}`);
    media.add(file);
    return `${base}content/media/${packId}/${file}`;
  };
  const body = (part, where) => {
    if (!part || (!part.text?.trim() && !part.html?.trim() && !part.images?.length)) throw new Error(`${where}: nothing to show`);
    const refs = part.images ?? [];
    const placed = new Set();
    const picture = (file, alt) => `<img src="${escapeHtml(image(file, where))}" alt="${alt}" loading="lazy">`;
    const inlineImage = (file, alt) => {
      const ref = refs.find((ref) => ref.file === file);
      if (!ref) throw new Error(`${where}: inline picture ${file} is missing from images`);
      placed.add(file);
      const description = alt === undefined ? escapeHtml(ref.alt ?? IMAGE_ALT) : alt.replace(/"/g, "&quot;");
      return picture(file, description);
    };
    let html = part.html?.trim() ? checkedHtml(part.html, where, inlineImage) : part.text?.trim() ? textToHtml(part.text) : "";
    for (const ref of refs) {
      if (!placed.has(ref.file)) html += picture(ref.file, escapeHtml(ref.alt ?? IMAGE_ALT));
    }
    return html;
  };

  const card = (taskId) => {
    const file = path.join(packDir, "tasks", `${taskId}.yaml`);
    if (!fs.existsSync(file)) throw new Error(`${packId}: missing task ${taskId}`);
    const task = readYaml(file);
    const where = `${packId}/${taskId}`;
    if (task.status !== "active") throw new Error(`${where}: status is ${task.status}, not active`);
    const id = where;
    if (task.kind === "theory") {
      // A theory card shows a body, blocks, or both.
      const blocks = theoryBlocks(task.blocks, where, image);
      return { id, kind: "theory", title: task.learning?.title ?? "", body: blocks.length && !task.question ? "" : body(task.question, where), blocks };
    }

    const answer = task.answer;
    if (!answer || !["single", "multi"].includes(answer.kind)) throw new Error(`${where}: unknown answer kind ${answer?.kind}`);
    const options = answer.options ?? [];
    if (options.length < 2 || options.length > LETTERS.length) throw new Error(`${where}: ${options.length} options`);
    // Saved answers are kept as whole numbers; any other id would not come back after a reload.
    if (options.some((o) => !Number.isInteger(o.id))) throw new Error(`${where}: an option id that is not a whole number`);
    if (new Set(options.map((o) => o.id)).size !== options.length) throw new Error(`${where}: repeated option id`);
    if (options.some((o) => !String(o.text ?? "").trim())) throw new Error(`${where}: an option without text`);
    const correct = options.filter((o) => o.correct).map((o) => o.id);
    if (correct.length === 0 || (answer.kind === "single" && correct.length !== 1)) throw new Error(`${where}: ${correct.length} right options for a ${answer.kind} answer`);
    const hint = task.learning?.hint;
    return {
      id,
      kind: "question",
      answerKind: answer.kind,
      body: body(task.question, where),
      hideOptions: answer.hide === true,
      points: task.points ?? null,
      choices: options.map((o, i) => ({ id: o.id, label: LETTERS[i], text: String(o.text), html: escapeHtml(String(o.text)) })),
      correct,
      hint: hint ? body(hint, `${where} hint`) : null,
      explanation: task.explanation ? body(task.explanation, `${where} explanation`) : null,
    };
  };

  const courses = [];
  const coursesDir = path.join(packDir, "courses");
  for (const name of fs.readdirSync(coursesDir).filter((f) => f.endsWith(".yaml")).sort()) {
    const slug = name.replace(/\.yaml$/, "");
    const source = readYaml(path.join(coursesDir, name));
    const lessonSlugs = new Set();
    const modules = (source.modules ?? []).map((module) => ({
      slug: module.slug,
      title: module.title,
      lessons: (module.lessons ?? []).map((lesson) => {
        if (lessonSlugs.has(lesson.slug)) throw new Error(`${slug}: repeated lesson ${lesson.slug}`);
        lessonSlugs.add(lesson.slug);
        const cards = (lesson.tasks ?? []).map(card);
        if (!cards.some((c) => c.kind === "question")) throw new Error(`${slug}/${lesson.slug}: a lesson without questions`);
        return { slug: lesson.slug, title: lesson.title, cards };
      }),
    }));
    if (lessonSlugs.size === 0) throw new Error(`${slug}: a course without lessons`);
    courses.push({
      slug,
      title: source.title,
      description: source.description ?? "",
      cover: source.cover?.file ? image(source.cover.file, slug) : null,
      grades: (source.tags?.grade ?? []).map(String),
      modules,
    });
  }

  for (const file of media) put(path.join("media", packId, file), fs.readFileSync(path.join(packDir, file)));
  return courses;
}

/** The path the site is served from, with a slash at each end: "/" or "/name/". */
export const basePath = (value) => `/${(value ?? "").replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");

/**
 * Builds every pack the bundle lists from `root` into `out`; returns the course index.
 * Picture addresses start with `base`, so they hold on a page at any depth.
 */
export function buildContent({ root, out, base = "/" }) {
  const bundle = readYaml(path.join(root, "bundle.yaml"));
  fs.mkdirSync(out, { recursive: true });
  const { put, sweep } = writer(out);
  const courses = (bundle.packs ?? []).flatMap((packId) => buildPack(root, put, packId, base));
  if (courses.length === 0) throw new Error("no courses to build");
  if (new Set(courses.map((c) => c.slug)).size !== courses.length) throw new Error("two courses share a slug");

  const index = {
    courses: courses.map((course) => {
      const lessons = course.modules.flatMap((m) => m.lessons);
      return {
        slug: course.slug,
        title: course.title,
        description: course.description,
        cover: course.cover,
        grades: course.grades,
        lessons: lessons.length,
        questions: lessons.flatMap((l) => l.cards.filter((c) => c.kind === "question").map((c) => c.id)),
      };
    }),
  };
  const sources = new Map();
  for (const { book, courses: sectionsByCourse } of bundle.sources ?? []) {
    for (const [slug, sections] of Object.entries(sectionsByCourse)) {
      if (sources.has(slug)) throw new Error(`${slug}: more than one source book`);
      sources.set(slug, { book, sections });
    }
  }
  for (const course of courses) {
    const source = sources.get(course.slug);
    put(`${course.slug}.json`, JSON.stringify(source ? { ...course, source } : course));
  }
  put("index.json", JSON.stringify(index));
  sweep();
  return index;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const index = buildContent({ root: path.join(project, "courses"), out: path.join(project, "public", "content"), base: basePath(process.env.BASE_PATH) });
  for (const course of index.courses) console.log(`${course.slug}: ${course.lessons} lessons, ${course.questions.length} questions`);
}
