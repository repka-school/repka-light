import { gzipSync } from "node:zlib";
import type { Plugin, Rollup } from "vite";

const LIMIT = 38 * 1024;

/** Follow static imports once, including the CSS each chunk brings with it. */
function collect(bundle: Rollup.OutputBundle, chunk: Rollup.OutputChunk, files: Set<string>, includeAssets: boolean) {
  if (files.has(chunk.fileName)) return;
  files.add(chunk.fileName);
  for (const css of chunk.viteMetadata?.importedCss ?? []) files.add(css);
  if (includeAssets) for (const asset of chunk.viteMetadata?.importedAssets ?? []) files.add(asset);
  for (const name of chunk.imports) {
    const dependency = bundle[name];
    if (dependency?.type === "chunk") collect(bundle, dependency, files, includeAssets);
  }
}

function gzipBytes(bundle: Rollup.OutputBundle, files: Iterable<string>) {
  let total = 0;
  for (const name of files) {
    const file = bundle[name];
    total += gzipSync(file.type === "chunk" ? file.code : file.source).byteLength;
  }
  return total;
}

const kib = (bytes: number) => (bytes / 1024).toFixed(2);

/** Size of opening the garden after the app has loaded. Each HTTP file is compressed separately. */
export function homesteadBudget(): Plugin {
  return {
    name: "homestead-budget",
    apply: "build",
    writeBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((file) => file.type === "chunk");
      const entry = chunks.find((chunk) => chunk.isEntry && chunk.facadeModuleId?.endsWith("/index.html"));
      const garden = chunks.find((chunk) => chunk.isDynamicEntry && chunk.facadeModuleId?.endsWith("/src/screens/HomesteadScreen.tsx"));
      if (!entry || !garden) this.error("Expected an app entry and a lazy Homestead screen to measure.");

      // The shared JS and CSS are already loaded. Images and fonts referenced by
      // other screens can load on demand, so only charge media imported by the garden.
      const shared = new Set<string>();
      collect(bundle, entry, shared, false);
      const gardenFiles = new Set(shared);
      collect(bundle, garden, gardenFiles, true);
      for (const name of shared) gardenFiles.delete(name);
      const bytes = gzipBytes(bundle, gardenFiles);
      const summary = `Homestead ${kib(bytes)} KiB gzip (limit ${kib(LIMIT)} KiB), shared app JS and CSS ${kib(gzipBytes(bundle, shared))} KiB gzip`;
      if (bytes > LIMIT) this.error(`${summary}. Garden files: ${[...gardenFiles].join(", ")}`);
      this.info(summary);
    },
  };
}
