import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findLatestDownloadsDir, findLatestNormalizedDir } from "./cli-helpers";

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
});
