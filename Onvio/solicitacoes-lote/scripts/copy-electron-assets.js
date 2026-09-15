const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "..", "src", "electron");
const targetDir = path.join(__dirname, "..", "dist", "electron");

fs.mkdirSync(targetDir, { recursive: true });

for (const fileName of ["renderer.html", "renderer.css", "renderer.js"]) {
  fs.copyFileSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));
}
