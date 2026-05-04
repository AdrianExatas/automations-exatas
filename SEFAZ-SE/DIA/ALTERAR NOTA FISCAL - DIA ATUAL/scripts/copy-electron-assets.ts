import { mkdir, copyFile } from "fs/promises";
import path from "path";

const outDir = path.resolve("dist", "electron");

await mkdir(outDir, { recursive: true });
await Promise.all([
  copyFile(path.resolve("src", "electron", "index.html"), path.join(outDir, "index.html")),
  copyFile(path.resolve("src", "electron", "styles.css"), path.join(outDir, "styles.css")),
]);
