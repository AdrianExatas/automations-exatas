import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertNoAttachmentIdentityMismatches,
  findAttachmentIdentityMismatches,
} from "./attachment-identity-gate";
import type { EmpresaBatchItem } from "./types";

function makeEmpresa(overrides: Partial<EmpresaBatchItem> = {}): EmpresaBatchItem {
  return {
    cnpj: "52169106000117",
    codigo: "427",
    nome: "MAX CONFECCOES TEXTIL LTDA",
    solicitante: "",
    departamento: "SETOR FISCAL",
    assunto: "",
    descricao: "",
    qtdArquivos: undefined,
    arquivos: [],
    ...overrides,
  };
}

describe("attachment-identity-gate", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detecta mismatch e aborta o lote", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-gate-"));
    tempDirs.push(dir);
    fs.writeFileSync(
      path.join(dir, "427 - UneCont - Tomados - ACHEI COMERCIO E SERVICOS.xlsx"),
      "x",
    );

    const mismatches = findAttachmentIdentityMismatches([makeEmpresa()], dir);
    expect(mismatches).toHaveLength(1);
    expect(() => assertNoAttachmentIdentityMismatches([makeEmpresa()], dir)).toThrow(
      /Abortando upload/,
    );
  });

  it("aceita arquivos coerentes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-gate-ok-"));
    tempDirs.push(dir);
    fs.writeFileSync(
      path.join(dir, "427 - UneCont - Tomados - MAX CONFECCOES TEXTIL.xlsx"),
      "x",
    );

    expect(findAttachmentIdentityMismatches([makeEmpresa()], dir)).toEqual([]);
    expect(() => assertNoAttachmentIdentityMismatches([makeEmpresa()], dir)).not.toThrow();
  });
});
