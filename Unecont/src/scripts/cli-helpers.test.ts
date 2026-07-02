import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findLatestDownloadsDir, findLatestNormalizedDir, getExcelPathArg } from "./cli-helpers";

describe("cli-helpers", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const dir of tempRoots.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("retorna o ultimo lote de downloads", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-cli-downloads-"));
    tempRoots.push(root);
    fs.mkdirSync(path.join(root, "Unecont_2026-03-10_09-00-00"));
    fs.mkdirSync(path.join(root, "Unecont_2026-03-12_17-34-38"));
    fs.mkdirSync(path.join(root, "outro-lote"));

    expect(findLatestDownloadsDir(root)).toBe(path.join(root, "Unecont_2026-03-12_17-34-38"));
  });

  it("retorna o ultimo lote normalizado", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-cli-normalized-"));
    tempRoots.push(root);
    fs.mkdirSync(path.join(root, "Unecont_2026-03-11_08-00-00"));
    fs.mkdirSync(path.join(root, "Unecont_2026-03-12_18-45-00"));

    expect(findLatestNormalizedDir(root)).toBe(path.join(root, "Unecont_2026-03-12_18-45-00"));
  });

  it("pode ignorar lotes normalizados sem arquivos de upload elegiveis", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-cli-normalized-files-"));
    tempRoots.push(root);
    const withFiles = path.join(root, "Unecont_2026-03-11_08-00-00");
    const emptyLatest = path.join(root, "Unecont_2026-03-12_18-45-00");
    fs.mkdirSync(withFiles, { recursive: true });
    fs.mkdirSync(path.join(emptyLatest, "_meta"), { recursive: true });
    fs.writeFileSync(path.join(emptyLatest, "_meta", "relatorio-upload.xlsx"), "");
    fs.writeFileSync(path.join(withFiles, "314 - Empresa.xlsx"), "");

    expect(findLatestNormalizedDir(root, { requireEligibleUploadFiles: true })).toBe(withFiles);
  });

  it("resolve o caminho da planilha por argumento explicito", () => {
    expect(getExcelPathArg(["--excel", "C:/tmp/empresas.xlsx"])).toBe("C:/tmp/empresas.xlsx");
    expect(getExcelPathArg(["--planilha=C:/tmp/outra.xlsx"])).toBe("C:/tmp/outra.xlsx");
    expect(getExcelPathArg(["C:/tmp/posicional.xlsx"])).toBe("C:/tmp/posicional.xlsx");
    expect(getExcelPathArg(["--headless"])).toBeNull();
  });
});
