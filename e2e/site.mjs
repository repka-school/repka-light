// The site for the browser tests: built for a sub-path, as a project site on
// GitHub Pages is, and served the way that host serves it. Files are plain
// files; an address with no file gets 404.html and the status 404; nothing
// is served outside the sub-path. The build goes to .e2e/site, apart from
// dist/ and public/content/, so a dev server running beside the tests keeps
// its own files. No analytics: the tests ask the page to stay on its origin.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { basePath, buildContent } from "../scripts/build-content.mjs";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(project, ".e2e", "site");
const base = basePath(process.env.BASE_PATH);
const port = Number(process.env.PORT);
if (!port) throw new Error("PORT is not set; run the browser tests with npm run test:e2e");

delete process.env.ANALYTICS;
await build({ root: project, logLevel: "warn", build: { outDir: out, emptyOutDir: true } });
// The build copied whatever content public/ held; this is the content for this sub-path.
buildContent({ root: path.join(project, "courses"), out: path.join(out, "content"), base });

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

/** The file an address names, or null: outside the sub-path, outside the build, or not a file. */
function fileFor(pathname) {
  if (!pathname.startsWith(base)) return null;
  let relative;
  try {
    relative = decodeURIComponent(pathname.slice(base.length));
  } catch {
    return null;
  }
  const file = path.join(out, relative.endsWith("/") || relative === "" ? `${relative}index.html` : relative);
  if (!file.startsWith(out + path.sep)) return null;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

const server = http.createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://site");
  if (`${pathname}/` === base) {
    response.writeHead(301, { location: base }).end();
    return;
  }
  const file = fileFor(pathname);
  const inside = pathname.startsWith(base);
  const served = file ?? (inside ? path.join(out, "404.html") : null);
  if (!served) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  // The host lets a browser keep a file for ten minutes.
  response.writeHead(file ? 200 : 404, { "content-type": types[path.extname(served)] ?? "application/octet-stream", "cache-control": "max-age=600" });
  fs.createReadStream(served).pipe(response);
});

server.listen(port, "127.0.0.1", () => console.log(`site: http://127.0.0.1:${port}${base}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
