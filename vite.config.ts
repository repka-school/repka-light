import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const GTM_URL = "https://www.googletagmanager.com/gtm.js?id=GTM-PGV3K8LL";
const CF_URL = "https://static.cloudflareinsights.com/beacon.min.js";
const CF_TOKEN = "42ea943f44b14746994f7cfa917cc3ab";

// Visitor analytics, added to the page only in the build that is published
// (the deploy workflow sets ANALYTICS=1), so local runs are not counted.
function analytics(): Plugin {
  return {
    name: "analytics",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "script", attrs: { async: true, src: GTM_URL }, injectTo: "head" },
      {
        tag: "script",
        children:
          "window.dataLayer = window.dataLayer || [];\n" +
          "function gtag(){dataLayer.push(arguments);}\n" +
          "gtag('js', new Date());",
        injectTo: "head",
      },
      {
        tag: "script",
        attrs: {
          type: "module",
          src: CF_URL,
          "data-cf-beacon": JSON.stringify({ token: CF_TOKEN }),
        },
        injectTo: "body",
      },
    ],
  };
}

// GitHub Pages has no rewrite rules: an address it has no file for gets
// 404.html. A copy of the page there lets any route open or reload directly.
function notFoundPage(): Plugin {
  let outDir = "dist";
  return {
    name: "not-found-page",
    apply: "build",
    configResolved: (config) => void (outDir = path.resolve(config.root, config.build.outDir)),
    closeBundle: () => fs.copyFileSync(path.join(outDir, "index.html"), path.join(outDir, "404.html")),
  };
}

// Routes are plain paths, so the build has to know the path the site is
// served from: BASE_PATH, "/" when unset. The content build reads it too.
const base = `/${(process.env.BASE_PATH ?? "").replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), notFoundPage(), ...(process.env.ANALYTICS === "1" ? [analytics()] : [])],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  build: { outDir: "dist", emptyOutDir: true },
  test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"] },
});
