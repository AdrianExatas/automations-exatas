import { mkdir, copyFile, rm } from "node:fs/promises";

async function build() {
  await rm("build", { recursive: true, force: true });
  await mkdir("build/main", { recursive: true });
  await mkdir("build/preload", { recursive: true });
  await mkdir("build/renderer", { recursive: true });

  const main = await Bun.build({
    entrypoints: ["src/main/main.ts"],
    outdir: "build/main",
    target: "node",
    format: "cjs",
    external: ["electron"],
    sourcemap: "external",
  });
  assertBuild(main);

  const preload = await Bun.build({
    entrypoints: ["src/preload/preload.ts"],
    outdir: "build/preload",
    target: "node",
    format: "cjs",
    external: ["electron"],
    sourcemap: "external",
  });
  assertBuild(preload);

  const renderer = await Bun.build({
    entrypoints: ["src/renderer/renderer.ts"],
    outdir: "build/renderer",
    target: "browser",
    format: "iife",
    sourcemap: "external",
  });
  assertBuild(renderer);

  await copyFile("src/renderer/index.html", "build/renderer/index.html");
  await copyFile("src/renderer/renderer.css", "build/renderer/renderer.css");
}

function assertBuild(result: Awaited<ReturnType<typeof Bun.build>>) {
  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }
}

await build();
