import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "src", "electron");
const distDir = path.join(root, "dist", "electron");

await mkdir(distDir, { recursive: true });
await copyFile(path.join(sourceDir, "index.html"), path.join(distDir, "index.html"));
await copyFile(path.join(sourceDir, "styles.css"), path.join(distDir, "styles.css"));
