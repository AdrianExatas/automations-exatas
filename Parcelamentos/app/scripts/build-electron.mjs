import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, "..");
const outDir = path.join(appRoot, "dist", "electron");

await fs.rm(path.join(appRoot, "dist"), { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const common = {
  bundle: true,
  platform: "node",
  target: "node22",
  sourcemap: true,
  external: ["electron", "playwright", "playwright-core"],
  logLevel: "info",
  absWorkingDir: appRoot,
};

await build({
  ...common,
  entryPoints: ["src/electron/main.ts"],
  outfile: "dist/electron/main.js",
  format: "cjs",
});

await build({
  ...common,
  entryPoints: ["src/electron/preload.ts"],
  outfile: "dist/electron/preload.cjs",
  format: "cjs",
});

for (const file of ["renderer.html", "renderer.css", "renderer.js"]) {
  await fs.copyFile(path.join(appRoot, "src", "electron", file), path.join(outDir, file));
}

console.log(`Build Electron concluido em ${outDir}`);
