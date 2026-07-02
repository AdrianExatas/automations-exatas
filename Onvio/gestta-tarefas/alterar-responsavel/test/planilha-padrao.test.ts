import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { criarPlanilhaPadrao, PLANILHA_PADRAO_HEADERS } from "../src/planilha-padrao";

test("gera planilha padrao com abas e cabecalhos esperados", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "planilha-padrao-"));
  const filePath = path.join(dir, "modelo.xlsx");

  try {
    criarPlanilhaPadrao(filePath);

    const workbook = XLSX.readFile(filePath);
    assert.deepEqual(workbook.SheetNames, ["Preenchimento", "Instrucoes"]);

    const preenchimento = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets.Preenchimento,
      { header: 1 }
    );
    assert.deepEqual(preenchimento[0], PLANILHA_PADRAO_HEADERS);
    assert.equal(preenchimento.length, 1);

    const instrucoes = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets.Instrucoes,
      { header: 1 }
    );
    assert.ok(instrucoes.length > 3);
    assert.ok(instrucoes.some((row) => row.includes("SETOR") && row.join(" ").includes("Obrigatorio")));
    assert.ok(
      instrucoes.some((row) =>
        row.includes("A automacao processa apenas linhas com CNPJ, RESPONSAVEL e SETOR preenchidos.")
      )
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
