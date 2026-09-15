import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import ExcelJS from "exceljs";

import { buildRunReport } from "../src/app.js";
import { writeReports } from "../src/report.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("relatorios", () => {
  test("mantem contagens consistentes em JSON, CSV e XLSX", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "dte-report-"));
    tempDirs.push(dir);
    const companies = [
      {
        cnpj: "11222333000181",
        corporateName: "Empresa =Teste",
        procurationStatus: "ATIVA",
        authorizedDet: true,
        totalMessages: 1,
        unreadMessages: 1,
        status: "processed" as const,
        error: "",
      },
    ];
    const messages = [
      {
        cnpj: "11222333000181",
        corporateName: "Empresa =Teste",
        uid: "uid-1",
        title: "Aviso",
        text: "Texto",
        sender: "MTE",
        type: "1",
        situation: "0",
        archived: false,
        createdAt: "2026-09-15T08:00:00",
        readAt: "",
        readByDeadlineAt: "",
        sourceSystem: "DET",
      },
    ];
    const report = buildRunReport(new Date("2026-09-15T11:00:00Z"), companies, messages, []);
    const files = await writeReports(dir, report);

    const parsed = JSON.parse(await readFile(files.jsonPath, "utf8"));
    const companiesCsv = await readFile(files.companiesCsvPath, "utf8");
    const messagesCsv = await readFile(files.messagesCsvPath, "utf8");
    const unreadCsv = await readFile(files.unreadMessagesCsvPath, "utf8");
    const actionCsv = await readFile(files.actionQueueCsvPath, "utf8");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(files.workbookPath);

    expect(parsed.summary.processed).toBe(1);
    expect(companiesCsv.split("\r\n").filter(Boolean)).toHaveLength(2);
    expect(messagesCsv.split("\r\n").filter(Boolean)).toHaveLength(2);
    expect(unreadCsv.split("\r\n").filter(Boolean)).toHaveLength(2);
    expect(actionCsv.split("\r\n").filter(Boolean)).toHaveLength(1);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Painel",
      "Fila_de_Acao",
      "Nao_Lidas",
      "Empresas",
      "Mensagens",
      "Falhas",
      "Regras",
    ]);
    expect(workbook.getWorksheet("Empresas")?.rowCount).toBe(2);
    expect(workbook.getWorksheet("Mensagens")?.rowCount).toBe(2);
  });
});
