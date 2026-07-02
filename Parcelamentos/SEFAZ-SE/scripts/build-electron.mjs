import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outDir = path.join(root, "dist", "electron");

await fs.rm(path.join(root, "dist"), { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const common = {
  bundle: true,
  platform: "node",
  target: "node22",
  sourcemap: true,
  external: ["electron", "playwright", "playwright-core"],
  logLevel: "info",
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
  await fs.copyFile(path.join(root, "src", "electron", file), path.join(outDir, file));
}
