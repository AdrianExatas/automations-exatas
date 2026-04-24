import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { writeMailboxWorkbook } from "./excel.js";
import {
  collectMessagesInDateWindow,
  createDateWindow,
  executeWithRequestRetries,
  MAILBOX_COLUMNS,
  parseMailboxPage,
  RequestRetriesExhaustedError,
  SessionConflictError,
} from "./sefaz-client.js";

const FIXTURES_DIR = resolve(process.cwd(), "src", "fixtures");
const mailboxPageOneHtml = readFileSync(resolve(FIXTURES_DIR, "mailbox-page-1.html"), "utf8");
const mailboxPageTwoHtml = readFileSync(resolve(FIXTURES_DIR, "mailbox-page-2.html"), "utf8");
const referenceDate = new Date(2026, 3, 8, 12, 0, 0);

test("parseMailboxPage extracts the expected columns from fixture HTML", async () => {
  const parsed = parseMailboxPage(mailboxPageOneHtml);

  expect(parsed.hasMailbox).toBeTruthy();
  expect(parsed.hasSessionConflict).toBeFalsy();
  expect(parsed.form?.pageSize).toBe(2);
  expect(parsed.messages).toHaveLength(2);
  expect(parsed.messages[0]).toMatchObject({
    emitente: "SEFAZ-MA",
    assunto: "Comunicado de Abril",
    classificacao: "Fiscalização",
    dataEnvio: "05/04/2026 09:15:00",
    dataLeitura: "06/04/2026 08:00:00",
    exigeCiencia: "Não",
    situacao: "-",
    vencimento: "",
  });
  expect(parsed.messages[1]).toMatchObject({
    emitente: "SEFAZ-MA",
    assunto: "Aviso de Março",
    classificacao: "",
    dataEnvio: "22/03/2026 13:30:00",
    dataLeitura: "",
    exigeCiencia: "Sim",
    situacao: "Cientificada",
    vencimento: "31/03/2026",
  });
});

test("collectMessagesInDateWindow keeps only current/previous month, deduplicates, and stops paging", async () => {
  const dateWindow = createDateWindow(referenceDate);
  let nextPageCalls = 0;

  const messages = await collectMessagesInDateWindow({
    initialHtml: mailboxPageOneHtml,
    dateWindow,
    getNextPageHtml: async () => {
      nextPageCalls += 1;
      return mailboxPageTwoHtml;
    },
  });

  expect(nextPageCalls).toBe(1);
  expect(messages).toHaveLength(2);
  expect(messages.map((message) => message.assunto)).toEqual([
    "Comunicado de Abril",
    "Aviso de Março",
  ]);
});

test("writeMailboxWorkbook creates the expected worksheet and headers", async ({}, testInfo) => {
  const parsed = parseMailboxPage(mailboxPageOneHtml);
  const outputPath = testInfo.outputPath("notificacoes.xlsx");

  await writeMailboxWorkbook(outputPath, parsed.messages);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);

  const worksheet = workbook.getWorksheet("Notificacoes");
  expect(worksheet).toBeDefined();
  expect(normalizeRowValues(worksheet?.getRow(1).values)).toEqual(
    MAILBOX_COLUMNS.map((column) => column.header),
  );
  expect(worksheet?.rowCount).toBe(3);
  expect(normalizeRowValues(worksheet?.getRow(2).values)).toEqual([
    "SEFAZ-MA",
    "Comunicado de Abril",
    "Fiscalização",
    "05/04/2026 09:15:00",
    "06/04/2026 08:00:00",
    "Não",
    "-",
    "",
  ]);
});

test("executeWithRequestRetries retries transient failures and eventually succeeds", async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await executeWithRequestRetries(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw createNetworkError("temporary timeout", "ETIMEDOUT");
      }

      return "ok";
    },
    {
      method: "GET",
      url: "https://sefaznet.sefaz.ma.gov.br/sefaznet/loginCert.do?method=efetuarLoginCertificado",
      maxRetries: 5,
      retryDelaysMs: [10, 20, 30],
      sleep: async (ms) => {
        delays.push(ms);
      },
    },
  );

  expect(result).toBe("ok");
  expect(attempts).toBe(3);
  expect(delays).toEqual([10, 20]);
});

test("executeWithRequestRetries also retries transient errors identified by message", async () => {
  let attempts = 0;

  const result = await executeWithRequestRetries(
    async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("connect ETIMEDOUT 181.191.88.18:443");
      }

      return "ok";
    },
    {
      method: "GET",
      url: "https://sefaznet.sefaz.ma.gov.br/sefaznet/loginCert.do?method=efetuarLoginCertificado",
      maxRetries: 2,
      retryDelaysMs: [1, 1],
      sleep: async () => undefined,
    },
  );

  expect(result).toBe("ok");
  expect(attempts).toBe(2);
});

test("executeWithRequestRetries raises a detailed error after exhausting retries", async () => {
  let attempts = 0;

  const error = await expectRequestError(async () =>
    executeWithRequestRetries(
      async () => {
        attempts += 1;
        throw createNetworkError("socket hang up", "ECONNRESET");
      },
      {
        method: "POST",
        url: "https://sefaznet.sefaz.ma.gov.br/sefaznet/caixaEntradaDomicilio.do?method=filtrarCaixaEntrada",
        maxRetries: 2,
        retryDelaysMs: [1, 1],
        sleep: async () => undefined,
      },
    ),
  );

  expect(error).toBeInstanceOf(RequestRetriesExhaustedError);
  expect(attempts).toBe(3);
  expect(error.message).toContain("POST");
  expect(error.message).toContain("filtrarCaixaEntrada");
  expect(error.message).toContain("3 tentativas");
  expect(error.message).toContain("ECONNRESET");
});

test("executeWithRequestRetries does not retry non-retryable errors", async () => {
  let attempts = 0;

  const error = await expectRequestError(async () =>
    executeWithRequestRetries(
      async () => {
        attempts += 1;
        throw new Error("portal error");
      },
      {
        method: "GET",
        url: "https://sefaznet.sefaz.ma.gov.br/sefaznet/login.do",
        maxRetries: 5,
        retryDelaysMs: [1, 1, 1],
        sleep: async () => undefined,
      },
    ),
  );

  expect(attempts).toBe(1);
  expect(error).not.toBeInstanceOf(RequestRetriesExhaustedError);
  expect(error.message).toBe("portal error");
});

test("executeWithRequestRetries does not retry SessionConflictError", async () => {
  let attempts = 0;

  const error = await expectRequestError(async () =>
    executeWithRequestRetries(
      async () => {
        attempts += 1;
        throw new SessionConflictError("session conflict");
      },
      {
        method: "GET",
        url: "https://sefaznet.sefaz.ma.gov.br/sefaznet/loginCert.do?method=efetuarLoginCertificado",
        maxRetries: 5,
        retryDelaysMs: [1, 1, 1],
        sleep: async () => undefined,
      },
    ),
  );

  expect(attempts).toBe(1);
  expect(error).toBeInstanceOf(SessionConflictError);
  expect(error.message).toBe("session conflict");
});

function normalizeRowValues(values: unknown): unknown[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.slice(1);
}

async function expectRequestError(action: () => Promise<unknown>): Promise<Error> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return error as Error;
  }

  throw new Error("Expected the action to fail.");
}

function createNetworkError(message: string, code: string): Error {
  const error = new Error(message);
  (error as NodeJS.ErrnoException).code = code;
  return error;
}
