const fs = require("fs");
const path = require("path");

const source = path.resolve(__dirname, "..", "src", "electron");
const target = path.resolve(__dirname, "..", "dist", "electron");

fs.mkdirSync(target, { recursive: true });
for (const fileName of ["renderer.html", "renderer.css", "renderer.js", "bulk-date.js", "batch-selection.js"]) {
  fs.copyFileSync(path.join(source, fileName), path.join(target, fileName));
}
