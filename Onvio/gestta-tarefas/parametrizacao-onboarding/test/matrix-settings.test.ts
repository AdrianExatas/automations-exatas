import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, test } from "vitest";
import {
  getMatrixInfo,
  readCustomMatrixPath,
  resolveMatrixPath,
  writeCustomMatrixPath,
} from "../src/electron/matrix-settings";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "matrix-settings-"));
  tempDirs.push(dir);
  return dir;
}

function createFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "xlsx", "utf8");
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("matrix settings", () => {
  test("sem configuracao customizada usa a planilha padrao", () => {
    const userDataPath = createTempDir();
    const defaultPath = path.join(userDataPath, "default.xlsx");
    createFile(defaultPath);

    expect(readCustomMatrixPath(userDataPath)).toBeNull();
    expect(resolveMatrixPath(userDataPath, defaultPath)).toBe(defaultPath);

    const info = getMatrixInfo(userDataPath, defaultPath);
    expect(info).toEqual({
      path: defaultPath,
      fileName: "default.xlsx",
      isCustom: false,
      exists: true,
    });
  });

  test("com caminho customizado valido usa a planilha selecionada", () => {
    const userDataPath = createTempDir();
    const defaultPath = path.join(userDataPath, "default.xlsx");
    const customPath = path.join(userDataPath, "custom.xlsx");
    createFile(defaultPath);
    createFile(customPath);

    writeCustomMatrixPath(userDataPath, customPath);

    expect(readCustomMatrixPath(userDataPath)).toBe(customPath);
    expect(resolveMatrixPath(userDataPath, defaultPath)).toBe(customPath);

    const info = getMatrixInfo(userDataPath, defaultPath);
    expect(info.path).toBe(customPath);
    expect(info.fileName).toBe("custom.xlsx");
    expect(info.isCustom).toBe(true);
    expect(info.exists).toBe(true);
  });

  test("com caminho customizado inexistente faz fallback para o padrao", () => {
    const userDataPath = createTempDir();
    const defaultPath = path.join(userDataPath, "default.xlsx");
    const missingPath = path.join(userDataPath, "missing.xlsx");
    createFile(defaultPath);

    writeCustomMatrixPath(userDataPath, missingPath);

    expect(resolveMatrixPath(userDataPath, defaultPath)).toBe(defaultPath);

    const info = getMatrixInfo(userDataPath, defaultPath);
    expect(info.path).toBe(defaultPath);
    expect(info.isCustom).toBe(false);
    expect(info.exists).toBe(true);
  });

  test("reset remove a selecao customizada salva", () => {
    const userDataPath = createTempDir();
    const defaultPath = path.join(userDataPath, "default.xlsx");
    const customPath = path.join(userDataPath, "custom.xlsx");
    createFile(defaultPath);
    createFile(customPath);

    writeCustomMatrixPath(userDataPath, customPath);
    writeCustomMatrixPath(userDataPath, null);

    expect(readCustomMatrixPath(userDataPath)).toBeNull();
    expect(resolveMatrixPath(userDataPath, defaultPath)).toBe(defaultPath);
  });
});
