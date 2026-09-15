import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getSheetSettingsPath,
  readSelectedSheetPath,
  writeSelectedSheetPath,
} from "../src/electron/sheet-settings";

test("persiste a ultima planilha selecionada entre sessoes", () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-settings-"));
  const sheetPath = path.join(userDataPath, "responsaveis.xlsx");

  try {
    writeSelectedSheetPath(userDataPath, sheetPath);

    assert.equal(readSelectedSheetPath(userDataPath), sheetPath);
    assert.deepEqual(JSON.parse(fs.readFileSync(getSheetSettingsPath(userDataPath), "utf8")), {
      selectedSheetPath: sheetPath,
    });
  } finally {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  }
});

test("limpar a selecao remove a configuracao persistida", () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-settings-"));

  try {
    writeSelectedSheetPath(userDataPath, "C:\\planilhas\\responsaveis.xlsx");
    writeSelectedSheetPath(userDataPath, null);

    assert.equal(readSelectedSheetPath(userDataPath), null);
    assert.equal(fs.existsSync(getSheetSettingsPath(userDataPath)), false);
  } finally {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  }
});
