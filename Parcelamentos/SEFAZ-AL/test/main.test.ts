import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INPUT_PATH, DEFAULT_OUTPUT_DIR, parseCliArgs, resolveOutputDir } from "../src/main.js";

test("usa model.xlsx e output/downloads por padrao", () => {
  const options = parseCliArgs([]);

  assert.equal(options.inputPath, DEFAULT_INPUT_PATH);
  assert.equal(options.outputDir, DEFAULT_OUTPUT_DIR);
  assert.equal(options.headed, false);
});

test("permite sobrescrever o diretorio de saida pela CLI", () => {
  const options = parseCliArgs(["--output", "./custom-downloads", "--headed"]);

  assert.equal(options.outputDir, "./custom-downloads");
  assert.equal(options.headed, true);
});

test("resolve o diretorio de saida dentro do pacote por padrao", () => {
  const cwd = path.resolve("C:\\repo\\Parcelamentos\\SEFAZ-AL");

  assert.equal(resolveOutputDir(cwd), path.join(cwd, "output", "downloads"));
});
