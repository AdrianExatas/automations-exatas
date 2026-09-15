import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadError, EmpresaNotFoundError, NoNotasError } from "./exceptions";
import type { EmpresaBatchItem } from "./types";

const launchBrowser = vi.fn();
const formatDownloadedReport = vi.fn();
const resolveEmpresasInput = vi.fn();
const loginExecute = vi.fn();
const selectEmpresa = vi.fn();
const navigateToServicosTomados = vi.fn();
const downloadReport = vi.fn();
const browserClose = vi.fn();
const ensureWorkbookReady = vi.fn();

vi.mock("./browser/launch", () => ({
  launchBrowser,
}));

vi.mock("./input", () => ({
  resolveEmpresasInput,
}));

vi.mock("./report-formatter", () => ({
  formatDownloadedReport,
}));

vi.mock("./workbook-ready", () => ({
  ensureWorkbookReady,
}));

vi.mock("./flows/login-flow", () => ({
  LoginFlow: class {
    execute = loginExecute;
  },
}));

vi.mock("./flows/download-flow", () => ({
  DownloadFlow: class {
    dismissBlockingDialogs = vi.fn().mockResolvedValue(false);
    selectEmpresa = selectEmpresa;
    navigateToServicosTomados = navigateToServicosTomados;
    assertSelectedEmpresa = vi.fn().mockResolvedValue(undefined);
    downloadReport = downloadReport;
  },
}));

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function collectLogs(logger: ReturnType<typeof createLogger>): string[] {
  const entries = [
    ...logger.info.mock.calls.map(([message], index) => ({
      level: "info",
      message: String(message),
      order: logger.info.mock.invocationCallOrder[index],
    })),
    ...logger.warn.mock.calls.map(([message], index) => ({
      level: "warn",
      message: String(message),
      order: logger.warn.mock.invocationCallOrder[index],
    })),
    ...logger.error.mock.calls.map(([message], index) => ({
      level: "error",
      message: String(message),
      order: logger.error.mock.invocationCallOrder[index],
    })),
  ];

  return entries
    .sort((a, b) => a.order - b.order)
    .map(({ level, message }) => `${level}:${message}`);
}

describe("downloadUnecontBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    launchBrowser.mockResolvedValue({
      browser: { close: browserClose },
      context: {},
      page: {},
    });
    browserClose.mockResolvedValue(undefined);
    loginExecute.mockResolvedValue(undefined);
    selectEmpresa.mockResolvedValue(undefined);
    navigateToServicosTomados.mockResolvedValue(undefined);
    downloadReport.mockResolvedValue("C:/tmp/downloads/001 - relatorio.xlsx");
    ensureWorkbookReady.mockResolvedValue({
      stable: true,
      sizeBytes: 30_014,
      attempts: 2,
    });
    formatDownloadedReport.mockResolvedValue({
      outputPath: "C:/tmp/downloads/001 - relatorio.xlsx",
      warnings: [],
      filledCount: 3,
      missingMappedCount: 0,
      missingUnmappedCount: 0,
      issues: [],
    });
  });

  it("emite logs em ordem para um lote simples sem formatacao", async () => {
    const empresa: EmpresaBatchItem = {
      cnpj: "12345678000190",
      codigo: "001",
      nome: "Empresa A",
      solicitante: "Solicitante",
      departamento: "Fiscal",
      assunto: "Assunto",
      descricao: "Descricao",
      arquivos: [],
    };
    const logger = createLogger();
    resolveEmpresasInput.mockReturnValue([empresa]);

    const { downloadUnecontBatch } = await import("./download-unecont");

    const result = await downloadUnecontBatch({
      credentials: { email: "teste@example.com", senha: "123" },
      input: { empresas: [empresa] },
      logger,
    });

    expect(result.summary).toEqual({
      total: 1,
      success: 1,
      noNotas: 0,
      notFound: 0,
      failed: 0,
      skipped: 0,
    });
    expect(collectLogs(logger)).toEqual([
      expect.stringMatching(/^info:Iniciando download UNECONT: 1 empresas\. Diretorio: /),
      "info:Realizando login no UNECONT...",
      "info:Login concluido.",
      "info:[1/1] Processando 001 - Empresa A (12345678000190)",
      "info:[1/1] Arquivo baixado: 001 - relatorio.xlsx",
      "info:[1/1] Concluida: 001 - Empresa A (12345678000190) -> 001 - relatorio.xlsx",
      "info:Resumo: 1 sucesso, 0 sem notas, 0 nao encontradas, 0 falhas, 0 puladas.",
    ]);
  });

  it("gera a planilha consolidada da execucao em _meta", async () => {
    const empresa: EmpresaBatchItem = {
      cnpj: "12345678000190",
      codigo: "001",
      nome: "Empresa A",
      solicitante: "Solicitante",
      departamento: "Fiscal",
      assunto: "Assunto",
      descricao: "Descricao",
      arquivos: [],
    };
    const downloadsDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-download-report-"));
    resolveEmpresasInput.mockReturnValue([empresa]);
    downloadReport.mockResolvedValue(path.join(downloadsDir, "001 - relatorio.xlsx"));

    try {
      const { downloadUnecontBatch } = await import("./download-unecont");

      const result = await downloadUnecontBatch({
        credentials: { email: "teste@example.com", senha: "123" },
        input: { empresas: [empresa] },
        browser: { downloadDir: downloadsDir },
      });

      expect(result.reportPath).toBe(path.join(downloadsDir, "_meta", "relatorio-execucao.xlsx"));
      expect(fs.existsSync(result.reportPath!)).toBe(true);

      const workbook = XLSX.readFile(result.reportPath!);
      const resumo = XLSX.utils.sheet_to_json<Record<string, string | number>>(
        workbook.Sheets.Resumo,
      );
      const itens = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Itens);

      expect(resumo).toEqual(
        expect.arrayContaining([
          { CAMPO: "DOWNLOADS_DIR", VALOR: downloadsDir },
          { CAMPO: "TOTAL", VALOR: 1 },
          { CAMPO: "SUCESSO", VALOR: 1 },
          { CAMPO: "FALHAS", VALOR: 0 },
        ]),
      );
      expect(itens).toEqual([
        {
          CODIGO: "001",
          EMPRESA: "Empresa A",
          CNPJ: "12345678000190",
          STATUS: "success",
          MENSAGEM: "001 - relatorio.xlsx",
          ARQUIVO: "001 - relatorio.xlsx",
          ARQUIVO_PATH: path.join(downloadsDir, "001 - relatorio.xlsx"),
          SOLICITANTE: "Solicitante",
          DEPARTAMENTO: "Fiscal",
          ASSUNTO: "Assunto",
        },
      ]);
    } finally {
      fs.rmSync(downloadsDir, { recursive: true, force: true });
    }
  });

  it("loga skipped, sem notas, nao encontrada e falha", async () => {
    const empresas: EmpresaBatchItem[] = [
      {
        cnpj: "11111111000111",
        codigo: "001",
        nome: "Ja Processada",
        solicitante: "Solicitante",
        departamento: "Fiscal",
        assunto: "Assunto",
        descricao: "Descricao",
        arquivos: [],
      },
      {
        cnpj: "22222222000122",
        codigo: "002",
        nome: "Com Sucesso",
        solicitante: "Solicitante",
        departamento: "Fiscal",
        assunto: "Assunto",
        descricao: "Descricao",
        arquivos: [],
      },
      {
        cnpj: "33333333000133",
        codigo: "003",
        nome: "Sem Notas",
        solicitante: "Solicitante",
        departamento: "Fiscal",
        assunto: "Assunto",
        descricao: "Descricao",
        arquivos: [],
      },
      {
        cnpj: "44444444000144",
        codigo: "004",
        nome: "Nao Encontrada",
        solicitante: "Solicitante",
        departamento: "Fiscal",
        assunto: "Assunto",
        descricao: "Descricao",
        arquivos: [],
      },
      {
        cnpj: "55555555000155",
        codigo: "005",
        nome: "Com Falha",
        solicitante: "Solicitante",
        departamento: "Fiscal",
        assunto: "Assunto",
        descricao: "Descricao",
        arquivos: [],
      },
    ];
    const logger = createLogger();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-download-test-"));
    const checkpointPath = path.join(tempDir, "checkpoint.json");

    try {
      fs.writeFileSync(
        checkpointPath,
        JSON.stringify({
          processed: [empresas[0].cnpj],
          no_notas: [],
          not_found: [],
          failed: [],
        }),
        "utf-8",
      );

      resolveEmpresasInput.mockReturnValue(empresas);
      selectEmpresa.mockImplementation(async (cnpj: string) => {
        if (cnpj === empresas[3].cnpj) {
          throw new EmpresaNotFoundError("Empresa nao cadastrada no UNECONT", cnpj);
        }
      });
      downloadReport.mockImplementation(async (cnpj: string) => {
        if (cnpj === empresas[1].cnpj) {
          return "C:/tmp/downloads/002 - relatorio.xlsx";
        }
        if (cnpj === empresas[2].cnpj) {
          throw new NoNotasError("Sem notas para o periodo", cnpj);
        }
        if (cnpj === empresas[4].cnpj) {
          throw new DownloadError("Falha inesperada", "C:/tmp/downloads", "timeout");
        }
        throw new Error(`CNPJ inesperado no downloadReport: ${cnpj}`);
      });

      const { downloadUnecontBatch } = await import("./download-unecont");

      const result = await downloadUnecontBatch({
        credentials: { email: "teste@example.com", senha: "123" },
        input: { empresas },
        checkpointPath,
        logger,
      });

      expect(result.summary).toEqual({
        total: 5,
        success: 1,
        noNotas: 1,
        notFound: 1,
        failed: 1,
        skipped: 1,
      });
      expect(collectLogs(logger)).toEqual([
        expect.stringMatching(/^info:Iniciando download UNECONT: 5 empresas\. Diretorio: /),
        "info:Realizando login no UNECONT...",
        "info:Login concluido.",
        "info:[1/5] Pulada: 001 - Ja Processada (11111111000111) (checkpoint)",
        "info:[2/5] Processando 002 - Com Sucesso (22222222000122)",
        "info:[2/5] Arquivo baixado: 002 - relatorio.xlsx",
        "info:[2/5] Concluida: 002 - Com Sucesso (22222222000122) -> 002 - relatorio.xlsx",
        "info:[3/5] Processando 003 - Sem Notas (33333333000133)",
        "warn:[3/5] Sem notas: 003 - Sem Notas (33333333000133)",
        "info:[4/5] Processando 004 - Nao Encontrada (44444444000144)",
        "warn:[4/5] Empresa nao encontrada: 004 - Nao Encontrada (44444444000144)",
        "info:[5/5] Processando 005 - Com Falha (55555555000155)",
        "error:[5/5] Falha: 005 - Com Falha (55555555000155) -> Falha inesperada",
        "info:Resumo: 1 sucesso, 1 sem notas, 1 nao encontradas, 1 falhas, 1 puladas.",
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("nao limpa o checkpoint quando um subconjunto termina mas ainda existem falhas pendentes", async () => {
    const empresa: EmpresaBatchItem = {
      cnpj: "10965766000164",
      codigo: "008",
      nome: "Empresa Nao Encontrada",
      solicitante: "Solicitante",
      departamento: "Fiscal",
      assunto: "Assunto",
      descricao: "Descricao",
      arquivos: [],
    };
    const outraFalha = "32855512000126";
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-checkpoint-subset-"));
    const checkpointPath = path.join(tempDir, "checkpoint.json");

    try {
      fs.writeFileSync(
        checkpointPath,
        JSON.stringify({
          processed: ["02295238000117"],
          no_notas: [],
          not_found: [],
          failed: [empresa.cnpj, outraFalha],
        }),
        "utf-8",
      );

      resolveEmpresasInput.mockReturnValue([empresa]);
      selectEmpresa.mockRejectedValueOnce(
        new EmpresaNotFoundError("Empresa nao cadastrada no UNECONT", empresa.cnpj),
      );

      const { downloadUnecontBatch } = await import("./download-unecont");

      const result = await downloadUnecontBatch({
        credentials: { email: "teste@example.com", senha: "123" },
        input: { empresas: [empresa] },
        checkpointPath,
      });

      expect(result.summary).toEqual({
        total: 1,
        success: 0,
        noNotas: 0,
        notFound: 1,
        failed: 0,
        skipped: 0,
      });
      expect(fs.existsSync(checkpointPath)).toBe(true);
      expect(JSON.parse(fs.readFileSync(checkpointPath, "utf-8"))).toEqual({
        processed: ["02295238000117"],
        no_notas: [],
        not_found: [empresa.cnpj],
        failed: [outraFalha],
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("faz retry da formatacao quando a primeira validacao vem inconsistente e recupera", async () => {
    const empresa: EmpresaBatchItem = {
      cnpj: "12345678000190",
      codigo: "001",
      nome: "Empresa A",
      solicitante: "Solicitante",
      departamento: "Fiscal",
      assunto: "Assunto",
      descricao: "Descricao",
      arquivos: [],
    };
    const logger = createLogger();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-download-format-"));
    const downloadsDir = path.join(tempDir, "downloads");
    const normalizedDir = path.join(tempDir, "normalized");
    const downloadedFile = path.join(downloadsDir, "001 - relatorio.xlsx");
    const normalizedFile = path.join(normalizedDir, "001 - relatorio.xlsx");
    fs.mkdirSync(downloadsDir, { recursive: true });
    fs.writeFileSync(downloadedFile, "stub");
    resolveEmpresasInput.mockReturnValue([empresa]);
    downloadReport.mockResolvedValue(downloadedFile);
    formatDownloadedReport
      .mockResolvedValueOnce({
        outputPath: normalizedFile,
        warnings: [],
        filledCount: 5,
        missingMappedCount: 107,
        missingUnmappedCount: 7,
        issues: [
          { rowNumber: 7, serviceItem: "01.06", reason: "missing_mapped" },
          { rowNumber: 8, serviceItem: "01.07", reason: "missing_mapped" },
        ],
      })
      .mockResolvedValueOnce({
        outputPath: normalizedFile,
        warnings: [],
        filledCount: 112,
        missingMappedCount: 0,
        missingUnmappedCount: 7,
        issues: [],
      });

    try {
      const { downloadUnecontBatch } = await import("./download-unecont");

      const result = await downloadUnecontBatch({
        credentials: { email: "teste@example.com", senha: "123" },
        input: { empresas: [empresa] },
        browser: { downloadDir: downloadsDir },
        logger,
        reportFormatting: {
          enabled: true,
          modelPath: "C:/tmp/modelo.xlsx",
          serviceMapPath: "C:/tmp/mapa.xlsx",
          overwrite: true,
          outputDir: normalizedDir,
        },
      });

      expect(result.summary.success).toBe(1);
      expect(result.normalizedDir).toBe(normalizedDir);
      expect(formatDownloadedReport).toHaveBeenCalledTimes(2);
      expect(formatDownloadedReport).toHaveBeenCalledWith(
        normalizedFile,
        expect.objectContaining({ outputDir: normalizedDir }),
      );
      expect(ensureWorkbookReady).toHaveBeenCalledTimes(2);
      expect(collectLogs(logger)).toEqual([
        `info:Iniciando download UNECONT: 1 empresas. Diretorio: ${downloadsDir}`,
        `info:Diretorio normalizado: ${normalizedDir}`,
        "info:Realizando login no UNECONT...",
        "info:Login concluido.",
        "info:[1/1] Processando 001 - Empresa A (12345678000190)",
        "info:[1/1] Arquivo baixado: 001 - relatorio.xlsx",
        "info:[1/1] Arquivo estabilizado: 001 - relatorio.xlsx (30014 bytes, 2 verificacoes)",
        "info:[1/1] Copia normalizada criada: 001 - relatorio.xlsx",
        "info:[1/1] Formatando planilha: 001 - relatorio.xlsx",
        "info:[1/1] Planilha formatada: 001 - relatorio.xlsx",
        "warn:[1/1] Primeira validacao inconsistente: 001 - relatorio.xlsx (5 descricoes preenchidas, 107 inconsistencias mapeaveis, 7 sem mapa)",
        "info:[1/1] Retry de formatacao: 001 - relatorio.xlsx",
        "info:[1/1] Planilha reformatada apos retry: 001 - relatorio.xlsx",
        "info:[1/1] Planilha validada: 001 - relatorio.xlsx (112 descricoes preenchidas, 0 inconsistencias mapeaveis, 7 sem mapa)",
        "info:[1/1] Concluida: 001 - Empresa A (12345678000190) -> 001 - relatorio.xlsx",
        "info:Resumo: 1 sucesso, 0 sem notas, 0 nao encontradas, 0 falhas, 0 puladas.",
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("falha o item quando a segunda tentativa ainda deixa codigos mapeaveis sem descricao", async () => {
    const empresa: EmpresaBatchItem = {
      cnpj: "12345678000190",
      codigo: "001",
      nome: "Empresa A",
      solicitante: "Solicitante",
      departamento: "Fiscal",
      assunto: "Assunto",
      descricao: "Descricao",
      arquivos: [],
    };
    const logger = createLogger();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-download-format-"));
    const downloadsDir = path.join(tempDir, "downloads");
    const normalizedDir = path.join(tempDir, "normalized");
    const downloadedFile = path.join(downloadsDir, "001 - relatorio.xlsx");
    const normalizedFile = path.join(normalizedDir, "001 - relatorio.xlsx");
    fs.mkdirSync(downloadsDir, { recursive: true });
    fs.writeFileSync(downloadedFile, "stub");
    resolveEmpresasInput.mockReturnValue([empresa]);
    downloadReport.mockResolvedValue(downloadedFile);
    formatDownloadedReport
      .mockResolvedValueOnce({
        outputPath: normalizedFile,
        warnings: [],
        filledCount: 5,
        missingMappedCount: 107,
        missingUnmappedCount: 7,
        issues: [
          { rowNumber: 7, serviceItem: "01.06", reason: "missing_mapped" },
          { rowNumber: 8, serviceItem: "01.07", reason: "missing_mapped" },
          { rowNumber: 9, serviceItem: "01.07", reason: "missing_mapped" },
        ],
      })
      .mockResolvedValueOnce({
        outputPath: normalizedFile,
        warnings: [],
        filledCount: 29,
        missingMappedCount: 85,
        missingUnmappedCount: 5,
        issues: [
          { rowNumber: 31, serviceItem: "09.01", reason: "missing_mapped" },
          { rowNumber: 32, serviceItem: "09.01", reason: "missing_mapped" },
          { rowNumber: 33, serviceItem: "10.05", reason: "missing_mapped" },
        ],
      });

    try {
      const { downloadUnecontBatch } = await import("./download-unecont");

      const result = await downloadUnecontBatch({
        credentials: { email: "teste@example.com", senha: "123" },
        input: { empresas: [empresa] },
        browser: { downloadDir: downloadsDir },
        logger,
        reportFormatting: {
          enabled: true,
          modelPath: "C:/tmp/modelo.xlsx",
          serviceMapPath: "C:/tmp/mapa.xlsx",
          overwrite: true,
          outputDir: normalizedDir,
        },
      });

      expect(result.summary).toEqual({
        total: 1,
        success: 0,
        noNotas: 0,
        notFound: 0,
        failed: 1,
        skipped: 0,
      });
      expect(result.normalizedDir).toBe(normalizedDir);
      expect(formatDownloadedReport).toHaveBeenCalledTimes(2);
      expect(formatDownloadedReport).toHaveBeenCalledWith(
        normalizedFile,
        expect.objectContaining({ outputDir: normalizedDir }),
      );
      expect(ensureWorkbookReady).toHaveBeenCalledTimes(2);
      expect(result.items[0]).toMatchObject({
        status: "failed",
        message:
          "Falha de consistencia na planilha 001 - relatorio.xlsx: 85 linhas mapeaveis sem descricao [linha 31 (09.01), linha 32 (09.01), linha 33 (10.05) e mais 82].",
      });
      expect(collectLogs(logger)).toEqual([
        `info:Iniciando download UNECONT: 1 empresas. Diretorio: ${downloadsDir}`,
        `info:Diretorio normalizado: ${normalizedDir}`,
        "info:Realizando login no UNECONT...",
        "info:Login concluido.",
        "info:[1/1] Processando 001 - Empresa A (12345678000190)",
        "info:[1/1] Arquivo baixado: 001 - relatorio.xlsx",
        "info:[1/1] Arquivo estabilizado: 001 - relatorio.xlsx (30014 bytes, 2 verificacoes)",
        "info:[1/1] Copia normalizada criada: 001 - relatorio.xlsx",
        "info:[1/1] Formatando planilha: 001 - relatorio.xlsx",
        "info:[1/1] Planilha formatada: 001 - relatorio.xlsx",
        "warn:[1/1] Primeira validacao inconsistente: 001 - relatorio.xlsx (5 descricoes preenchidas, 107 inconsistencias mapeaveis, 7 sem mapa)",
        "info:[1/1] Retry de formatacao: 001 - relatorio.xlsx",
        "info:[1/1] Planilha reformatada apos retry: 001 - relatorio.xlsx",
        "info:[1/1] Planilha validada: 001 - relatorio.xlsx (29 descricoes preenchidas, 85 inconsistencias mapeaveis, 5 sem mapa)",
        "error:[1/1] Falha de consistencia na planilha 001 - relatorio.xlsx: 85 linhas mapeaveis sem descricao [linha 31 (09.01), linha 32 (09.01), linha 33 (10.05) e mais 82].",
        "error:[1/1] Falha: 001 - Empresa A (12345678000190) -> Falha de consistencia na planilha 001 - relatorio.xlsx: 85 linhas mapeaveis sem descricao [linha 31 (09.01), linha 32 (09.01), linha 33 (10.05) e mais 82].",
        "info:Resumo: 0 sucesso, 0 sem notas, 0 nao encontradas, 1 falhas, 0 puladas.",
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
