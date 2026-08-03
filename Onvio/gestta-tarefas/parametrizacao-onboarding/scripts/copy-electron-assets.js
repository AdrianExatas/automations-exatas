const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const electronSourceDir = path.join(root, "src", "electron");
const electronOutputDir = path.join(root, "dist", "electron");
const resourcesOutputDir = path.join(root, "dist", "resources");
const matrixFileName = "PLANILHA GERAL TAREFAS POR REGIME.xlsx";
const iconFileName = "icon.ico";

function drawRect(pixels, size, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (row < 0 || row >= size || col < 0 || col >= size) continue;
      const bottomUpRow = size - 1 - row;
      const offset = (bottomUpRow * size + col) * 4;
      pixels[offset] = color.b;
      pixels[offset + 1] = color.g;
      pixels[offset + 2] = color.r;
      pixels[offset + 3] = color.a;
    }
  }
}

function createIcon(filePath) {
  const size = 256;
  const pixels = Buffer.alloc(size * size * 4);
  const green = { r: 20, g: 108, b: 92, a: 255 };
  const blue = { r: 36, g: 75, b: 122, a: 255 };
  const white = { r: 255, g: 255, b: 255, a: 255 };

  drawRect(pixels, size, 0, 0, size, size, green);
  drawRect(pixels, size, 0, 184, size, 72, blue);

  drawRect(pixels, size, 48, 58, 28, 132, white);
  drawRect(pixels, size, 76, 58, 72, 28, white);
  drawRect(pixels, size, 120, 86, 28, 48, white);
  drawRect(pixels, size, 76, 122, 66, 28, white);

  drawRect(pixels, size, 164, 70, 54, 22, white);
  drawRect(pixels, size, 148, 92, 22, 76, white);
  drawRect(pixels, size, 212, 92, 22, 76, white);
  drawRect(pixels, size, 164, 168, 54, 22, white);

  const maskRowBytes = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRowBytes * size);
  const dibSize = 40 + pixels.length + mask.length;
  const dib = Buffer.alloc(dibSize);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(size, 4);
  dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(0, 16);
  dib.writeUInt32LE(pixels.length + mask.length, 20);
  pixels.copy(dib, 40);
  mask.copy(dib, 40 + pixels.length);

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);
  entry.writeUInt8(0, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(dib.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  fs.writeFileSync(filePath, Buffer.concat([header, entry, dib]));
}

fs.mkdirSync(electronOutputDir, { recursive: true });
fs.mkdirSync(resourcesOutputDir, { recursive: true });

for (const fileName of ["renderer.html", "renderer.css", "renderer.js"]) {
  fs.copyFileSync(
    path.join(electronSourceDir, fileName),
    path.join(electronOutputDir, fileName),
  );
}

const matrixSourcePath = path.join(root, matrixFileName);
if (!fs.existsSync(matrixSourcePath)) {
  throw new Error(`Matriz padrao nao encontrada: ${matrixSourcePath}`);
}

fs.copyFileSync(matrixSourcePath, path.join(resourcesOutputDir, matrixFileName));
createIcon(path.join(resourcesOutputDir, iconFileName));
