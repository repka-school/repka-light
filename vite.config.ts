import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const GTM_URL = "https://www.googletagmanager.com/gtm.js?id=GTM-PGV3K8LL";
const CF_URL = "https://static.cloudflareinsights.com/beacon.min.js";
const CF_TOKEN = "d29c42e7f1ff408d90a2294f73db3bd1";

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

// The libraries bundled into the page drop their licence comments when
// minified, so the build lists each one with its licence text instead.
function thirdPartyNotices(): Plugin {
  return {
    name: "third-party-notices",
    apply: "build",
    generateBundle(_options, bundle) {
      const roots = new Set<string>();
      for (const file of Object.values(bundle)) {
        if (file.type !== "chunk") continue;
        for (const id of file.moduleIds) {
          const match = /^(.*[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id.replace(/^\0/, ""));
          if (match) roots.add(match[1]);
        }
      }
      // Tailwind's base styles land in the CSS, which has no module ids to follow.
      roots.add(path.resolve("node_modules/tailwindcss"));
      const notices = [...roots]
        .map((root) => {
          const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
          const licenseFile = fs.readdirSync(root).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f));
          const author = typeof pkg.author === "string" ? pkg.author : pkg.author?.name;
          const fallback = [`License: ${pkg.license ?? "unknown"}`, author && `Copyright (c) ${author}`, pkg.homepage ?? pkg.repository?.url ?? pkg.repository].filter(Boolean).join("\n");
          const text = licenseFile ? fs.readFileSync(path.join(root, licenseFile), "utf8").trim() : fallback;
          return { name: `${pkg.name}@${pkg.version}`, license: pkg.license, text };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      const body = notices.map((n) => `${n.name} (${n.license})\n\n${n.text}`).join("\n\n" + "-".repeat(72) + "\n\n");
      this.emitFile({
        type: "asset",
        fileName: "third-party-licenses.txt",
        source: `This site bundles the following open-source packages.\n\n${"-".repeat(72)}\n\n${body}\n`,
      });
    },
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

const withAnalytics = process.env.ANALYTICS === "1";

export default defineConfig({
  base,
  // The footer names the analytics services only in a build that loads them.
  define: { __ANALYTICS__: JSON.stringify(withAnalytics) },
  plugins: [react(), tailwindcss(), notFoundPage(), thirdPartyNotices(), ...(withAnalytics ? [analytics()] : [])],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  build: { outDir: "dist", emptyOutDir: true },
  // The browser tests build a site and write their traces under .e2e/; a dev server running beside them does not reload for those.
  server: { watch: { ignored: ["**/.e2e/**"] } },
  test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"] },
});
