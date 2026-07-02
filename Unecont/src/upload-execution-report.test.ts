import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import type { EmpresaBatchItem, UploadBatchResult } from "./types";
import { generateUploadRunId, writeUploadExecutionReport } from "./upload-execution-report";

function sampleEmpresa(overrides: Partial<EmpresaBatchItem> = {}): EmpresaBatchItem {
  return {
    cnpj: "12345678000190",
    codigo: "001",
    nome: "Empresa A",
    solicitante: "Solicitante",
    departamento: "Fiscal",
    assunto: "Assunto",
    descricao: "Descricao",
    arquivos: [],
    ...overrides,
  };
}

describe("upload-execution-report", () => {
  it("generateUploadRunId segue o padrao Unecont_upload_data_hora", () => {
    const id = generateUploadRunId();
    expect(id).toMatch(/^Unecont_upload_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
  });

  it("grava Resumo e Itens em _meta/relatorio-upload.xlsx", () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-upload-report-"));
    const excelPath = path.join(baseDir, "empresas.xlsx");
    fs.writeFileSync(excelPath, "stub");

    const result: UploadBatchResult = {
      summary: { total: 2, success: 1, failed: 1, skipped: 0 },
      items: [
        {
          empresa: sampleEmpresa({ codigo: "001" }),
          status: "success",
          message: "1 anexo(s) enviado(s).",
          ticketId: "abc-123",
          attachmentCount: 1,
          resolvedRequesterId: "requester-uuid-001",
          warnings: ["Aviso A"],
        },
        {
          empresa: sampleEmpresa({ codigo: "002", nome: "Empresa B" }),
          status: "failed",
          message: "Falha API",
          warnings: undefined,
        },
      ],
      warnings: ["Falha ao carregar API do BD"],
    };

    try {
      const reportPath = writeUploadExecutionReport({
        result,
        runId: "Unecont_2026-04-13_12-00-00",
        reportBaseDir: baseDir,
        attachmentsDir: path.join(baseDir, "normalized"),
        empresasExcelPath: excelPath,
        dryRun: false,
        skipAttachments: false,
      });

      expect(reportPath).toBe(path.join(baseDir, "_meta", "relatorio-upload.xlsx"));
      expect(fs.existsSync(reportPath)).toBe(true);

      const workbook = XLSX.readFile(reportPath);
      expect(workbook.SheetNames).toEqual(["Resumo", "Itens"]);

      const resumo = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Resumo);
      const itens = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Itens);

      expect(resumo).toEqual(
        expect.arrayContaining([
          { CAMPO: "RUN_ID", VALOR: "Unecont_2026-04-13_12-00-00" },
          { CAMPO: "TOTAL", VALOR: 2 },
          { CAMPO: "SUCESSO", VALOR: 1 },
          { CAMPO: "FALHAS", VALOR: 1 },
          { CAMPO: "DRY_RUN", VALOR: "nao" },
          { CAMPO: "SEM_ANEXOS", VALOR: "nao" },
          { CAMPO: "AVISOS_GLOBAIS", VALOR: "Falha ao carregar API do BD" },
        ]),
      );

      expect(itens).toHaveLength(2);
      expect(itens[0]).toMatchObject({
        CODIGO: "001",
        STATUS: "success",
        TICKET_ID: "abc-123",
        QTD_ANEXOS: 1,
        ONVIO_REQUESTER_ID_RESOLVIDO: "requester-uuid-001",
        AVISOS: "Aviso A",
      });
      expect(itens[1]).toMatchObject({
        CODIGO: "002",
        STATUS: "failed",
        MENSAGEM: "Falha API",
      });
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
