// Turns the course packs under courses/ into the JSON and pictures the site
// loads: public/content/index.json, one file per course, one per program,
// and media/.
// Fails on anything a lesson could not show: a missing task or picture, a
// question without a right answer, or MathML outside the supported subset.
// Fails also on a task that still carries an editorial note: the packs are
// published as they are, and such notes are not written for readers.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { Transformer } from "@napi-rs/image";
import { escapeHtml, parseMarkup, renderMarkup } from "./content-markup.mjs";
import { presentOptions } from "./content-options.mjs";
import { drillCards } from "./drill-content.mjs";

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];
const IMAGE_ALT = "Иллюстрация к заданию";
/** The drawings a theory block may name; the site draws each one (src/ui/pictures/TheoryPicture.tsx). */
export const THEORY_PICTURES = [
  "book", "reread", "question", "magnifier", "check", "pencil", "list", "counters", "cup", "corner", "plus", "minus", "plusminus", "brackets", "letter", "variable", "triangle",
  "zero", "two", "four", "roman", "arrow", "swap", "rewind", "table", "shield", "mask", "bulb", "venn-left", "venn-both", "venn-right", "venn-out",
  "pattern", "cells", "pairs", "odd", "tree", "pair", "bag", "chicken", "rabbit", "grid-small", "grid-big", "scissors", "equal", "shapes", "sticks",
  "medal", "talk", "posts", "log", "bell", "cake", "people", "boat", "jug-full", "jug-empty", "jug-pour", "scales", "clock", "calendar", "stones",
  "sudoku", "domino", "coords", "key", "graph", "cube", "net", "blocks", "rook", "bishop", "knight", "tangram", "pentomino", "mirror",
];

const readYaml = (file) => parse(fs.readFileSync(file, "utf8"));
const hasBody = (part) => part?.text?.trim() || part?.html?.trim() || part?.images?.length;

/** Plain text as one paragraph, its line breaks kept. */
export const textToHtml = (text) => `<p>${escapeHtml(text.trim()).replace(/\n/g, "<br>")}</p>`;

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

const pictureFormats = new Map([[".png", "png"], [".jpg", "jpeg"], [".jpeg", "jpeg"], [".webp", "webp"]]);

function readPicture(local, where) {
  const expected = pictureFormats.get(path.extname(local).toLowerCase());
  if (!expected) throw new Error(`${where}: unsupported picture format ${path.basename(local)}`);
  const bytes = fs.readFileSync(local);
  try {
    const image = new Transformer(bytes);
    if (image.metadataSync().format !== expected) throw new Error("file type differs from its extension");
    image.rawPixelsSync();
  } catch (cause) {
    throw new Error(`${where}: invalid ${expected} picture ${path.basename(local)}`, { cause });
  }
  return bytes;
}

function readPack(root, packId, base) {
  if (typeof packId !== "string" || !PLAIN_SLUG.test(packId)) throw new Error(`invalid pack name ${packId}`);
  const packDir = path.join(root, "packs", packId);
  const pack = readYaml(path.join(packDir, "pack.yaml"));
  if (pack.id !== packId) throw new Error(`${packId}: pack.yaml names the pack ${pack.id}`);
  const imported = pack.origin === "scraped";
  const media = new Map();

  const image = (file, where) => {
    if (typeof file !== "string" || file.split("/").some((part) => !part || part === "." || part === ".." || part.includes("\\"))) {
      throw new Error(`${where}: invalid picture file ${file}`);
    }
    const local = path.join(packDir, file);
    if (!fs.statSync(local, { throwIfNoEntry: false })?.isFile()) throw new Error(`${where}: missing picture ${file}`);
    if (!fs.realpathSync(local).startsWith(fs.realpathSync(packDir) + path.sep)) throw new Error(`${where}: picture is outside the pack ${file}`);
    if (!media.has(file)) media.set(file, readPicture(local, where));
    return `${base}content/media/${packId}/${file.split("/").map(encodeURIComponent).join("/")}`;
  };
  const readMarkup = (part, where) => part?.html?.trim() ? parseMarkup(part.html, where, imported) : null;
  const body = (part, where, { nodes = readMarkup(part, where), sourceURL, answerPicture, requireAlt = false, role = IMAGE_ALT } = {}) => {
    if (!hasBody(part)) throw new Error(`${where}: nothing to show`);
    const refs = part.images ?? [];
    const candidates = answerPicture ? [...refs, answerPicture] : refs;
    const placed = new Set();
    const resolved = (src) => {
      try {
        return new URL(src, sourceURL || "https://pack.invalid/").href;
      } catch {
        return null;
      }
    };
    const picture = (ref, alt) => {
      const { file } = ref;
      if (placed.has(file)) return "";
      placed.add(file);
      const src = image(file, where);
      // The pack's editor can override an imported caption in the image list.
      const descriptions = imported ? [ref.alt, alt] : [alt, ref.alt];
      if (file === answerPicture?.file) descriptions.unshift(answerPicture.alt);
      const description = descriptions.find((value) => typeof value === "string" && value.trim())?.trim().replace(/\s+/g, " ");
      if (requireAlt && (!description || description === IMAGE_ALT || /^Изображение вариантов ответа \S+–\S+$/u.test(description))) {
        throw new Error(`${where}: picture ${file} needs alt text describing its contents`);
      }
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(description || role)}" loading="lazy">`;
    };
    const inlineImage = (src, alt) => {
      const url = resolved(src);
      const ref = candidates.find((ref) => ref.file === src || (url && url === resolved(ref.original_url ?? ref.file)));
      if (!ref) {
        if (imported) return "";
        throw new Error(`${where}: inline picture ${src} is missing from images`);
      }
      return picture(ref, requireAlt || !imported ? alt : undefined);
    };
    let html = nodes ? renderMarkup(nodes, { where, renderImage: inlineImage }).html : part.text?.trim() ? textToHtml(part.text) : "";
    for (const ref of candidates) html += picture(ref);
    return html;
  };

  const card = (taskId) => {
    const file = path.join(packDir, "tasks", `${taskId}.yaml`);
    if (!fs.existsSync(file)) throw new Error(`${packId}: missing task ${taskId}`);
    const task = readYaml(file);
    const where = `${packId}/${taskId}`;
    if (task.note !== undefined) throw new Error(`${where}: an editorial note; remove the note field before publishing the task`);
    if (["draft", "voided", "retired"].includes(task.status)) return null;
    if (task.status !== "active") throw new Error(`${where}: status is ${task.status}, not active`);
    const id = where;
    const sourceURL = task.source?.url;
    if (task.kind === "theory") {
      // A theory card shows a body, blocks, or both.
      const blocks = theoryBlocks(task.blocks, where, image);
      return { id, kind: "theory", title: task.learning?.title ?? "", body: blocks.length && !task.question ? "" : body(task.question, where, { sourceURL, role: "Иллюстрация к теории" }), blocks };
    }

    const answer = task.answer;
    if (!answer || !["single", "multi"].includes(answer.kind)) throw new Error(`${where}: unknown answer kind ${answer?.kind}`);
    const options = answer.options ?? [];
    if (options.length < 2 || options.length > LETTERS.length) throw new Error(`${where}: ${options.length} options`);
    // Saved answers are kept as whole numbers; any other id would not come back after a reload.
    if (options.some((o) => !Number.isInteger(o.id))) throw new Error(`${where}: an option id that is not a whole number`);
    if (options.some((o) => o.id < 1 || !Number.isSafeInteger(o.id))) throw new Error(`${where}: an option id outside the supported range`);
    if (new Set(options.map((o) => o.id)).size !== options.length) throw new Error(`${where}: repeated option id`);
    const answerPicture = answer.picture;
    const labels = options.map((o) => o.label ?? "");
    if (labels.some(Boolean) && (labels.some((label) => typeof label !== "string" || !label.trim()) || new Set(labels).size !== labels.length)) {
      throw new Error(`${where}: option labels must all be present and unique when written`);
    }
    if (answerPicture) {
      if (options.some((o) => String(o.text ?? "") !== "")) throw new Error(`${where}: an option with text beside an answer picture`);
    } else if (options.some((o) => !String(o.text ?? "").trim())) {
      throw new Error(`${where}: an option without text`);
    }
    const correct = options.filter((o) => o.correct).map((o) => o.id);
    if (correct.length === 0 || (answer.kind === "single" && correct.length !== 1)) throw new Error(`${where}: ${correct.length} right options for a ${answer.kind} answer`);
    const nodes = readMarkup(task.question, where);
    const choices = presentOptions(nodes, options.map((o, i) => ({ id: o.id, label: labels[i] || LETTERS[i], text: String(o.text ?? "") })), { where, picture: answerPicture });
    const hideOptions = answer.hide === true;
    if (hideOptions && choices.some(({ html }) => !html)) throw new Error(`${where}: options cannot be hidden when shown in the question`);
    const hint = task.learning?.hint;
    return {
      id,
      kind: "question",
      answerKind: answer.kind,
      body: body(task.question, where, { nodes, sourceURL, answerPicture, requireAlt: true }),
      hideOptions,
      points: task.points ?? null,
      choices,
      correct,
      hint: hasBody(hint) ? body(hint, `${where} hint`, { sourceURL, role: "Иллюстрация к подсказке" }) : null,
      explanation: hasBody(task.explanation) ? body(task.explanation, `${where} explanation`, { sourceURL, role: "Иллюстрация к решению" }) : null,
    };
  };

  const writeMedia = (put) => {
    for (const [file, bytes] of media) put(path.join("media", packId, file), bytes);
  };
  return { packDir, card, image, body, writeMedia };
}

function coursesOf(packId, { packDir, image, body }, cardFor) {
  const coursesDir = path.join(packDir, "courses");
  const courseFiles = fs.existsSync(coursesDir) ? fs.readdirSync(coursesDir) : [];
  return courseFiles.filter((f) => f.endsWith(".yaml")).sort().map((name) => {
    const slug = name.replace(/\.yaml$/, "");
    const source = readYaml(path.join(coursesDir, name));
    const coverPicture = source.cover?.picture;
    if (coverPicture !== undefined && (source.cover.file || !THEORY_PICTURES.includes(coverPicture))) {
      throw new Error(`${slug}: invalid course cover picture ${coverPicture}`);
    }
    const lessonSlugs = new Set();
    const lessons = source.lessons ?? (source.tasks ? [{ slug, title: source.title, tasks: source.tasks }] : []);
    const modules = (source.modules ?? [{ slug, title: "", lessons }]).map((module) => ({
      slug: module.slug,
      title: module.title,
      lessons: (module.lessons ?? []).map((lesson) => {
        if (lessonSlugs.has(lesson.slug)) throw new Error(`${slug}: repeated lesson ${lesson.slug}`);
        lessonSlugs.add(lesson.slug);
        if (lesson.drill !== undefined) {
          const id = `${slug}/${lesson.slug}`;
          if (!lesson.drill || typeof lesson.drill !== "object" || Array.isArray(lesson.drill) || lesson.tasks !== undefined) {
            throw new Error(`${id}: invalid drill lesson`);
          }
          const introPart = typeof lesson.intro === "string" ? { text: lesson.intro } : lesson.intro;
          const intro = introPart ? body(introPart, `${id} intro`) : "";
          return { slug: lesson.slug, title: lesson.title, cards: drillCards(id, lesson.title, lesson.drill, intro) };
        }
        const cards = (lesson.tasks ?? []).map((taskId) => cardFor(packId, taskId)).filter(Boolean);
        if (!cards.some((c) => c.kind === "question")) throw new Error(`${slug}/${lesson.slug}: a lesson without questions`);
        return { slug: lesson.slug, title: lesson.title, cards };
      }),
    }));
    if (lessonSlugs.size === 0) throw new Error(`${slug}: a course without lessons`);
    return {
      slug,
      title: source.title,
      description: source.description ?? "",
      cover: source.cover?.file ? image(source.cover.file, slug) : null,
      ...(coverPicture ? { coverPicture } : {}),
      grades: (source.tags?.grade ?? []).map(String),
      modules,
    };
  });
}

/** A name that is safe as a file name and as a part of an address. */
const PLAIN_SLUG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * A program: the main topics of a school year, in order, each with the
 * section it belongs to and the points it covers. It is a plan: a topic names no lessons. Fails on a field it does
 * not know, so a misspelt one is not dropped in silence.
 */
function readProgram(root, slug) {
  if (typeof slug !== "string" || !PLAIN_SLUG.test(slug)) throw new Error(`program ${slug}: the slug is not a plain name`);
  const file = path.join(root, "programs", `${slug}.yaml`);
  if (!fs.existsSync(file)) throw new Error(`${slug}: missing program file`);
  const source = readYaml(file);
  const text = (value, where, what) => {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${where}: ${what} is empty`);
    return value.trim();
  };
  const known = (object, fields, where) => {
    if (!object || typeof object !== "object" || Array.isArray(object)) throw new Error(`${where}: not a set of fields`);
    for (const field of Object.keys(object)) if (!fields.includes(field)) throw new Error(`${where}: unknown field ${field}`);
  };
  known(source, ["title", "description", "tags", "sections", "topics"], slug);
  if (source.sections !== undefined && !Array.isArray(source.sections)) throw new Error(`${slug}: sections is not a list`);
  // The parts of the subject its topics belong to, each with its name and a built-in drawing to tell it by.
  const sections = (source.sections ?? []).map((section, i) => {
    const where = `${slug}/section ${section?.slug ?? i + 1}`;
    known(section, ["slug", "title", "picture"], where);
    if (typeof section.slug !== "string" || !PLAIN_SLUG.test(section.slug)) throw new Error(`${where}: the slug is not a plain name`);
    if (section.picture !== undefined && !THEORY_PICTURES.includes(section.picture)) throw new Error(`${where}: an unknown picture ${section.picture}`);
    return { slug: section.slug, title: text(section.title, where, "the title"), ...(section.picture ? { picture: section.picture } : {}) };
  });
  if (new Set(sections.map((s) => s.slug)).size !== sections.length) throw new Error(`${slug}: a repeated section`);
  if (!Array.isArray(source.topics) || source.topics.length === 0) throw new Error(`${slug}: a program without topics`);
  const topicSlugs = new Set();
  const topics = source.topics.map((topic, i) => {
    const where = `${slug}/${topic?.slug ?? `topic ${i + 1}`}`;
    known(topic, ["slug", "title", "section", "covers"], where);
    if (typeof topic.slug !== "string" || !PLAIN_SLUG.test(topic.slug)) throw new Error(`${where}: the slug is not a plain name`);
    if (topicSlugs.has(topic.slug)) throw new Error(`${slug}: repeated topic ${topic.slug}`);
    topicSlugs.add(topic.slug);
    if (topic.covers !== undefined && !Array.isArray(topic.covers)) throw new Error(`${where}: covers is not a list`);
    const covers = (topic.covers ?? []).map((point, n) => text(point, where, `point ${n + 1} of covers`));
    if (new Set(covers).size !== covers.length) throw new Error(`${where}: a point of covers is repeated`);
    if (topic.section !== undefined && !sections.some((s) => s.slug === topic.section)) throw new Error(`${where}: an unknown section ${topic.section}`);
    return { slug: topic.slug, title: text(topic.title, where, "the title"), ...(topic.section ? { section: topic.section } : {}), covers };
  });
  return {
    slug,
    title: text(source.title, slug, "the title"),
    description: source.description === undefined ? "" : text(source.description, slug, "the description"),
    grades: (source.tags?.grade ?? []).map(String),
    sections,
    topics,
  };
}

/** The path the site is served from, with a slash at each end: "/" or "/name/". */
export const basePath = (value) => `/${(value ?? "").replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");

/**
 * Builds every pack and program the bundle lists from `root` into `out`; returns the index.
 * Picture addresses start with `base`, so they hold on a page at any depth.
 */
export function buildContent({ root, out, base = "/" }) {
  const bundle = readYaml(path.join(root, "bundle.yaml"));
  fs.mkdirSync(out, { recursive: true });
  const { put, sweep } = writer(out);
  const packs = new Map((bundle.packs ?? []).map((packId) => [packId, readPack(root, packId, base)]));
  const cardFor = (coursePack, member) => {
    const [target, ...parts] = member.split(":");
    const packId = parts.length ? target : coursePack;
    const taskId = parts.length ? parts.join("/") : member;
    const pack = packs.get(packId);
    if (!pack) throw new Error(`${coursePack}: unknown pack ${packId} in course member ${member}`);
    const card = pack.card(taskId);
    if (packId !== coursePack && card?.kind === "theory") throw new Error(`${coursePack}: cannot include another pack's theory card ${member}`);
    return card;
  };
  const courses = [...packs].flatMap(([packId, pack]) => coursesOf(packId, pack, cardFor));
  if (courses.length === 0) throw new Error("no courses to build");
  if (new Set(courses.map((c) => c.slug)).size !== courses.length) throw new Error("two courses share a slug");
  const programs = (bundle.programs ?? []).map((slug) => readProgram(root, slug));
  if (new Set(programs.map((p) => p.slug)).size !== programs.length) throw new Error("two programs share a slug");

  const index = {
    courses: courses.map((course) => {
      const lessons = course.modules.flatMap((m) => m.lessons);
      const cards = lessons.flatMap((l) => l.cards);
      const drills = cards.filter((c) => c.kind === "drill").map((c) => c.id);
      return {
        slug: course.slug,
        title: course.title,
        description: course.description,
        cover: course.cover,
        ...(course.coverPicture ? { coverPicture: course.coverPicture } : {}),
        grades: course.grades,
        lessons: lessons.length,
        questions: cards.filter((c) => c.kind === "question").map((c) => c.id),
        ...(drills.length ? { drills } : {}),
      };
    }),
    programs: programs.map(({ slug, title, description, grades, topics }) => ({ slug, title, description, grades, topics: topics.length })),
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
  // In a folder of their own, so a program and a course may share a slug.
  for (const program of programs) put(path.join("programs", `${program.slug}.json`), JSON.stringify(program));
  for (const pack of packs.values()) pack.writeMedia(put);
  put("index.json", JSON.stringify(index));
  sweep();
  return index;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const index = buildContent({ root: path.join(project, "courses"), out: path.join(project, "public", "content"), base: basePath(process.env.BASE_PATH) });
  for (const course of index.courses) {
    const content = course.drills ? `${course.drills.length} games` : `${course.questions.length} questions`;
    console.log(`${course.slug}: ${course.lessons} lessons, ${content}`);
  }
  for (const program of index.programs) console.log(`program ${program.slug}: ${program.topics} topics`);
}
