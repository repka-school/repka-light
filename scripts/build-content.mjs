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
const ALLOWED_TAGS = new Set(["p", "br", "b", "strong", "i", "em", "sub", "sup", "ul", "ol", "li", "table", "caption", "thead", "tbody", "tr", "th", "td"]);
const ALLOWED_ATTRIBUTES = new Set(["colspan", "rowspan"]);

const readYaml = (file) => parse(fs.readFileSync(file, "utf8"));

export const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text as one paragraph, its line breaks kept. */
export const textToHtml = (text) => `<p>${escapeHtml(text.trim()).replace(/\n/g, "<br>")}</p>`;

/** Authored markup, checked against the allowed tags; a table gets a frame that scrolls when it is too wide. */
export function checkedHtml(html, where) {
  for (const [, closing, tag, attributes] of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    if (!ALLOWED_TAGS.has(tag.toLowerCase())) throw new Error(`${where}: tag <${tag}> is not allowed`);
    if (closing) continue;
    for (const [, name] of attributes.matchAll(/([a-zA-Z-]+)\s*=/g)) {
      if (!ALLOWED_ATTRIBUTES.has(name.toLowerCase())) throw new Error(`${where}: attribute ${name} is not allowed on <${tag}>`);
    }
  }
  if (/<(?![/a-zA-Z])/.test(html)) throw new Error(`${where}: a stray "<" in markup`);
  return html.replace(/<table[\s\S]*?<\/table>/g, (table) => `<div class="scroll-frame">${table}</div>`);
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
    let html = part.html?.trim() ? checkedHtml(part.html, where) : part.text?.trim() ? textToHtml(part.text) : "";
    for (const ref of part.images ?? []) html += `<img src="${image(ref.file, where)}" alt="${escapeHtml(ref.alt ?? IMAGE_ALT)}" loading="lazy">`;
    return html;
  };

  const card = (taskId) => {
    const file = path.join(packDir, "tasks", `${taskId}.yaml`);
    if (!fs.existsSync(file)) throw new Error(`${packId}: missing task ${taskId}`);
    const task = readYaml(file);
    const where = `${packId}/${taskId}`;
    if (task.status !== "active") throw new Error(`${where}: status is ${task.status}, not active`);
    const id = where;
    if (task.kind === "theory") return { id, kind: "theory", title: task.learning?.title ?? "", body: body(task.question, where) };

    const answer = task.answer;
    if (!answer || !["single", "multi"].includes(answer.kind)) throw new Error(`${where}: unknown answer kind ${answer?.kind}`);
    const options = answer.options ?? [];
    if (options.length < 2 || options.length > LETTERS.length) throw new Error(`${where}: ${options.length} options`);
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
  for (const course of courses) put(`${course.slug}.json`, JSON.stringify(course));
  put("index.json", JSON.stringify(index));
  sweep();
  return index;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const index = buildContent({ root: path.join(project, "courses"), out: path.join(project, "public", "content"), base: basePath(process.env.BASE_PATH) });
  for (const course of index.courses) console.log(`${course.slug}: ${course.lessons} lessons, ${course.questions.length} questions`);
}
