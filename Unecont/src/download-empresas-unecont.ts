import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { launchBrowser } from "./browser/launch";
import {
  DEFAULT_UNECONT_EMPRESAS_URL,
  DEFAULT_UNECONT_LOGIN_URL,
  type Config,
  validateConfig,
} from "./config";
import { LoginFlow } from "./flows/login-flow";
import { resolveRuntimePath } from "./project-paths";
import { findColumn } from "./domain/empresa-normalization";
import type {
  DownloadEmpresasUnecontOptions,
  DownloadEmpresasUnecontResult,
  DownloadLogger,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

const REPORT_DOWNLOAD_TYPE = "15";
const OUTPUT_FILENAME = "base-unecont.xlsx";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateForReportName(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatRuntimeMonth(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function buildDefaultReportName(date = new Date()): string {
  return `UneCont - Empresas - EXATAS CONTABILIDADE - ${formatDateForReportName(date)}.xlsx`;
}

function buildRuntimeConfig(options: DownloadEmpresasUnecontOptions): Config {
  return {
    unecontEmail: options.credentials.email,
    unecontSenha: options.credentials.senha,
    headless: options.browser?.headless ?? true,
    defaultTimeout: options.timeouts?.defaultTimeoutSeconds ?? 10,
    shortTimeout: options.timeouts?.shortTimeoutSeconds ?? 3,
    longTimeout: options.timeouts?.longTimeoutSeconds ?? 20,
    loginUrl: options.loginUrl ?? DEFAULT_UNECONT_LOGIN_URL,
    servicosTomadosUrl: "",
    empresasUrl: options.empresasUrl ?? DEFAULT_UNECONT_EMPRESAS_URL,
  };
}

function logMessage(
  logger: DownloadLogger | undefined,
  level: keyof DownloadLogger,
  message: string,
): void {
  logger?.[level](message);
}

async function readRequestVerificationToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const selectors = [
      "#inputTokenCSRF",
      'input[name="ctl00$ctl00$inputTokenCSRF"]',
      'input[name="__RequestVerificationToken"]',
      'input[name="RequestVerificationToken"]',
      'meta[name="request-verification-token"]',
      'meta[name="RequestVerificationToken"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector<HTMLInputElement | HTMLMetaElement>(selector);
      const value =
        element instanceof HTMLMetaElement
          ? element.content
          : (element as HTMLInputElement | null)?.value;
      if (value?.trim()) return value.trim();
    }

    const scripts = Array.from(document.scripts).map((script) => script.textContent ?? "");
    for (const script of scripts) {
      const match = script.match(/RequestVerificationToken["']?\s*[:=]\s*["']([^"']+)["']/i);
      if (match?.[1]?.trim()) return match[1].trim();
    }

    return "";
  });

  if (!token) {
    throw new Error("RequestVerificationToken nao encontrado na pagina de empresas do Unecont.");
  }

  return token;
}

function assertWorkbookBuffer(buffer: Buffer): void {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    const preview = buffer.toString("utf8", 0, Math.min(buffer.length, 500)).replace(/\s+/g, " ");
    throw new Error(
      `Download da base de empresas nao retornou um arquivo Excel valido. Resposta: ${preview || "<vazia>"}`,
    );
  }
}

export function validateEmpresasUnecontWorkbook(filePath: string): void {
  let rows: Record<string, unknown>[];
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error("planilha sem abas");
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
      defval: "",
      raw: false,
    }) as Record<string, unknown>[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Base de empresas do Unecont invalida: ${message}`);
  }

  const columns = Object.keys(rows[0] ?? {});
  const cnpjColumn = findColumn(columns, ["cnpj empresa", "cnpj", "cpf"]);
  const codigoColumn = findColumn(columns, ["codigo", "código"]);
  const nomeColumn = findColumn(columns, ["razao social", "razão social", "empresa", "nome"]);
  const ativoColumn = findColumn(columns, ["ativo"]);

  if (!cnpjColumn || !codigoColumn || !nomeColumn || !ativoColumn) {
    throw new Error(
      "Base de empresas do Unecont precisa conter CNPJ, Codigo, Razao Social/Empresa e Ativo?.",
    );
  }
}

export async function downloadEmpresasUnecont(
  options: DownloadEmpresasUnecontOptions,
): Promise<DownloadEmpresasUnecontResult> {
  const config = buildRuntimeConfig(options);
  validateConfig(config);

  const outputDir = path.resolve(
    options.outputDir ?? resolveRuntimePath("planilhas-operacionais", formatRuntimeMonth()),
  );
  const reportName = options.reportName?.trim() || buildDefaultReportName();
  fs.mkdirSync(outputDir, { recursive: true });

  const { browser, page } = await launchBrowser({
    headless: config.headless,
    downloadsPath: outputDir,
  });

  try {
    logMessage(options.logger, "info", "Realizando login no UNECONT...");
    await new LoginFlow(page, config).execute();

    logMessage(options.logger, "info", "Abrindo listagem de empresas do UNECONT...");
    await page.goto(config.empresasUrl, {
      waitUntil: "domcontentloaded",
      timeout: config.defaultTimeout * 1000,
    });

    const token = await readRequestVerificationToken(page);
    const listagemUrl = new URL(
      "/Contador/Empresas/Default.aspx/BaixaRelatorioExcelListagemEmpresa",
      config.empresasUrl,
    ).toString();
    const downloadUrl = new URL("/_pages/_download/Download.ashx", config.empresasUrl).toString();
    const origin = new URL(config.empresasUrl).origin;

    logMessage(options.logger, "info", "Solicitando geracao da base de empresas...");
    const listagemResponse = await page.context().request.post(listagemUrl, {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        origin,
        referer: config.empresasUrl,
        requestverificationtoken: token,
        "x-requested-with": "XMLHttpRequest",
      },
      data: {
        parametroPesquisa: {
          TextoPesquisa: "",
          Pagina: 1,
          QuantidadeRegistros: 10,
        },
        filtroListagem: null,
        exibeExcluido: 0,
      },
    });

    if (!listagemResponse.ok()) {
      throw new Error(
        `Falha ao gerar base de empresas: ${listagemResponse.status()} ${await listagemResponse.text()}`,
      );
    }

    logMessage(options.logger, "info", "Baixando Excel da base de empresas...");
    const downloadResponse = await page.context().request.post(downloadUrl, {
      headers: {
        accept: "application/json",
        "cache-control": "no-cache",
        origin,
        referer: config.empresasUrl,
        requestverificationtoken: token,
        "x-requested-with": "XMLHttpRequest",
      },
      multipart: {
        Nome: reportName,
        tipoDownload: REPORT_DOWNLOAD_TYPE,
        id: "null",
      },
    });

    const buffer = await downloadResponse.body();
    if (!downloadResponse.ok()) {
      throw new Error(
        `Falha ao baixar base de empresas: ${downloadResponse.status()} ${buffer.toString("utf8", 0, 500)}`,
      );
    }
    assertWorkbookBuffer(buffer);

    const filePath = path.join(outputDir, OUTPUT_FILENAME);
    fs.writeFileSync(filePath, buffer);
    validateEmpresasUnecontWorkbook(filePath);

    logMessage(options.logger, "info", `Base de empresas baixada: ${filePath}`);
    return {
      outputDir,
      filePath,
      reportName,
      sizeBytes: buffer.length,
    };
  } finally {
    await browser.close();
  }
}
