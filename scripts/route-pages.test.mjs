import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildContent } from "./build-content.mjs";
import { routesOf, writeRoutePages } from "./route-pages.mjs";

const courses = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "courses");
const temps = [];
const temp = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "routes-"));
  temps.push(dir);
  return dir;
};
afterEach(() => temps.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

/** A built site in a temporary directory: the page and the bundled courses. */
function site() {
  const out = temp();
  fs.writeFileSync(path.join(out, "index.html"), "<!doctype html><title>page</title>");
  const index = buildContent({ root: courses, out: path.join(out, "content") });
  return { out, index };
}

describe("the pages of the addresses", () => {
  it("are one for each fixed screen, course, lesson and program", () => {
    const { out, index } = site();
    const routes = writeRoutePages(out);
    const lessons = index.courses.reduce((n, course) => n + course.lessons, 0);
    expect(routes).toHaveLength(4 + index.courses.length + lessons + index.programs.length);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toEqual(expect.arrayContaining(["courses", "programs", "profile", "homestead", ...index.courses.map((course) => `course/${course.slug}`), ...index.programs.map((program) => `program/${program.slug}`)]));
    const page = fs.readFileSync(path.join(out, "index.html"), "utf8");
    for (const route of routes) expect(fs.readFileSync(path.join(out, `${route}.html`), "utf8"), route).toBe(page);
  });

  it("are only the fixed screens when no content is built", () => {
    const out = temp();
    fs.writeFileSync(path.join(out, "index.html"), "page");
    expect(writeRoutePages(out)).toEqual(["courses", "programs", "profile", "homestead"]);
    expect(fs.readdirSync(out).sort()).toEqual(["courses.html", "homestead.html", "index.html", "profile.html", "programs.html"]);
  });

  it("leave out a slug that is not a plain file name", () => {
    const content = temp();
    const lesson = (slug) => ({ slug, title: "L", cards: [] });
    fs.writeFileSync(path.join(content, "index.json"), JSON.stringify({ courses: [{ slug: "maths" }, { slug: "../up" }], programs: [{ slug: "year-8" }, { slug: "a/b" }] }));
    fs.mkdirSync(path.join(content, "courses"));
    fs.writeFileSync(path.join(content, "courses", "maths.json"), JSON.stringify({ modules: [{ lessons: [lesson("one"), lesson("a/b"), lesson("два")] }] }));
    expect(routesOf(content)).toEqual(["courses", "programs", "profile", "homestead", "program/year-8", "course/maths", "course/maths/lesson/one"]);
  });
});
