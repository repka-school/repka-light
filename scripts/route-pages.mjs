// Gives every address of the site a file. The site is one page that shows a
// screen by its address, and a static host has a file only for the index, so
// it answers every other address with its «not found» page: the screen still
// shows, but with the status 404, which search engines and link previews take
// at its word. The host serves `name.html` for the address `name`, so a copy
// of the page under each address's name makes that address answer 200.
// Addresses the site does not have keep getting 404.html.

import fs from "node:fs";
import path from "node:path";

/** The screens with a fixed address (src/main.tsx). */
const FIXED = ["courses", "profile", "homestead"];
/** A slug that is a plain file name: anything else is left to 404.html, which shows it just the same. */
const plain = (slug) => typeof slug === "string" && /^[a-z0-9][a-z0-9-]*$/i.test(slug);

/** The addresses of a built site, without the leading slash: the fixed screens, every course and every lesson. */
export function routesOf(contentDir) {
  const routes = [...FIXED];
  const indexFile = path.join(contentDir, "index.json");
  if (!fs.existsSync(indexFile)) return routes;
  for (const { slug } of JSON.parse(fs.readFileSync(indexFile, "utf8")).courses) {
    if (!plain(slug)) continue;
    routes.push(`course/${slug}`);
    const course = JSON.parse(fs.readFileSync(path.join(contentDir, `${slug}.json`), "utf8"));
    for (const lesson of course.modules.flatMap((module) => module.lessons)) {
      if (plain(lesson.slug)) routes.push(`course/${slug}/lesson/${lesson.slug}`);
    }
  }
  return routes;
}

/** Writes a copy of the built page for every address of the site in `outDir`; returns the addresses. */
export function writeRoutePages(outDir) {
  const page = fs.readFileSync(path.join(outDir, "index.html"));
  const routes = routesOf(path.join(outDir, "content"));
  for (const route of routes) {
    const file = path.join(outDir, `${route}.html`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page);
  }
  return routes;
}
