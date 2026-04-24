/**
 * Script de investigação: intercepta todo o tráfego HTTP durante uma execução real
 * para mapear URLs, métodos, payloads e respostas — base para reescrever em HTTP puro.
 *
 * Usa allHeaders() para capturar cookies (que headers() não expõe).
 *
 * Uso: node --env-file=.env dist/network-trace.js
 * Saída: output/network-trace.json, output/network-trace-cookies.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Request, type Response } from "playwright";
import { tryLoadPfxCertificateLenient } from "./certificate/load-pfx.js";
import { readCompaniesWorkbook } from "./companies.js";
import {
  CERT_ORIGIN,
  MAIN_SEARCHBOX_PATTERN,
  MAILBOX_HEADING_PATTERN,
  AUTO_LOGIN_TIMEOUT_MS,
  loginWithCertificate,
} from "./portal.js";

type TraceEntry = {
  seq: number;
  timestamp: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  postData: string | null;
  status: number | null;
  responseHeaders: Record<string, string>;
  contentType: string | null;
  bodyPreview: string | null;
};

const MAX_BODY_PREVIEW = 4000;

// Apenas oculta o valor do Bearer token; cookies ficam visíveis
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) => {
      if (k.toLowerCase() === "authorization") {
        return [k, `[REDACTED len=${v.length}]`];
      }
      return [k, v];
    }),
  );
}

async function tryGetBodyPreview(response: Response): Promise<string | null> {
  try {
    const contentType = response.headers()["content-type"] ?? "";
    if (
      contentType.includes("text/") ||
      contentType.includes("application/json") ||
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("application/xml")
    ) {
      const text = await response.text();
      return text.slice(0, MAX_BODY_PREVIEW) + (text.length > MAX_BODY_PREVIEW ? "…[truncado]" : "");
    }
  } catch {
    // ignora erros ao ler body (ex: recursos já desalocados)
  }
  return null;
}

function attachListeners(
  emitter: { on: (event: string, handler: (...args: unknown[]) => void) => void },
  entries: TraceEntry[],
  pendingRequests: Map<Request, TraceEntry>,
  seqRef: { value: number },
  prefix: string,
): void {
  (emitter as Parameters<typeof emitter.on>[1] extends never ? never : { on(event: "request", h: (r: Request) => void): void; on(event: "response", h: (r: Response) => void): void })

  const typedEmitter = emitter as {
    on(event: "request", handler: (r: Request) => void): void;
    on(event: "response", handler: (r: Response) => void): void;
  };

  typedEmitter.on("request", (request: Request) => {
    const entry: TraceEntry = {
      seq: seqRef.value++,
      timestamp: new Date().toISOString(),
      method: request.method(),
      url: request.url(),
      requestHeaders: {},
      postData: request.postData(),
      status: null,
      responseHeaders: {},
      contentType: null,
      bodyPreview: null,
    };
    pendingRequests.set(request, entry);
    entries.push(entry);
    console.log(`[TRACE]${prefix} REQ  ${entry.method.padEnd(6)} ${entry.url.slice(0, 110)}`);
  });

  typedEmitter.on("response", async (response: Response) => {
    const entry = pendingRequests.get(response.request());
    if (!entry) return;
    pendingRequests.delete(response.request());

    // allHeaders() captura headers completos incluindo cookies
    const [reqAllHeaders, resAllHeaders] = await Promise.all([
      response.request().allHeaders().catch(() => response.request().headers()),
      response.allHeaders().catch(() => response.headers()),
    ]);

    entry.requestHeaders = sanitizeHeaders(reqAllHeaders);
    entry.status = response.status();
    entry.responseHeaders = sanitizeHeaders(resAllHeaders);
    entry.contentType = resAllHeaders["content-type"] ?? null;
    entry.bodyPreview = await tryGetBodyPreview(response);

    console.log(
      `[TRACE]${prefix} RES  ${String(entry.status).padEnd(4)} ${(entry.contentType?.split(";")[0] ?? "").padEnd(28)} ${entry.url.slice(0, 80)}`,
    );
  });
}

async function main(): Promise<void> {
  const companies = await readCompaniesWorkbook();
  const firstCompany = companies[0];
  if (!firstCompany) throw new Error("Nenhuma empresa encontrada na planilha.");
  console.log(`[TRACE] Usando empresa: ${firstCompany.code} - ${firstCompany.name}`);

  const certConfig = tryLoadPfxCertificateLenient();
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const context = await browser.newContext({
    viewport: null,
    clientCertificates: certConfig
      ? [{ origin: CERT_ORIGIN, pfxPath: certConfig.pfxPath, passphrase: certConfig.passphrase }]
      : [],
  });

  const page = await context.newPage();
  const entries: TraceEntry[] = [];
  const pendingRequests = new Map<Request, TraceEntry>();
  const seqRef = { value: 0 };

  attachListeners(page as unknown as Parameters<typeof attachListeners>[0], entries, pendingRequests, seqRef, "");

  const snapshots: Record<string, unknown> = {};

  try {
    console.log("[TRACE] Fazendo login...");
    await loginWithCertificate(page);

    snapshots["after_login"] = await context.cookies();
    console.log(`[TRACE] Cookies após login: ${(snapshots["after_login"] as unknown[]).length}`);

    console.log("[TRACE] Buscando empresa...");
    const searchBox = page.getByRole("textbox", { name: MAIN_SEARCHBOX_PATTERN });
    await searchBox.click();
    await searchBox.fill(firstCompany.stateRegistrationDisplay);
    await page.getByRole("button", { name: /Consultar/i }).click();
    await page.waitForLoadState("networkidle").catch(() => undefined);

    console.log("[TRACE] Selecionando empresa...");
    await page.getByTitle("selecionar", { exact: true }).click();
    await page.waitForLoadState("networkidle").catch(() => undefined);

    snapshots["before_ageat"] = await context.cookies();
    console.log(`[TRACE] Cookies antes do e-AGEAT: ${(snapshots["before_ageat"] as unknown[]).length}`);

    console.log("[TRACE] Abrindo e-AGEAT...");
    const popupPromise = context.waitForEvent("page", { timeout: 8_000 }).catch(() => null);
    await page.getByRole("link", { name: /e-AGEAT ATIVO/i }).click();
    const ageatPage = (await popupPromise) ?? page;

    if (ageatPage !== page) {
      await ageatPage.waitForLoadState("domcontentloaded");
      attachListeners(ageatPage as unknown as Parameters<typeof attachListeners>[0], entries, pendingRequests, seqRef, "[AGEAT]");
    }

    snapshots["after_ageat_open"] = await context.cookies();
    console.log(`[TRACE] Cookies após abrir e-AGEAT: ${(snapshots["after_ageat_open"] as unknown[]).length}`);

    console.log("[TRACE] Abrindo caixa de entrada...");
    const mailboxLink = ageatPage.getByRole("link", {
      name: /Caixa de Entrada do Domic.lio Eletr.nico/i,
    });
    if (await mailboxLink.isVisible().catch(() => false)) {
      await mailboxLink.click();
      await ageatPage.waitForLoadState("networkidle").catch(() => undefined);
    }

    await ageatPage.getByText(MAILBOX_HEADING_PATTERN).waitFor({ timeout: AUTO_LOGIN_TIMEOUT_MS });
    console.log("[TRACE] Caixa de entrada aberta. Aguardando 4s para flush de requests...");
    await ageatPage.waitForTimeout(4_000);

    snapshots["after_mailbox"] = await context.cookies();
    console.log(`[TRACE] Cookies na caixa de entrada: ${(snapshots["after_mailbox"] as unknown[]).length}`);

    if (ageatPage !== page) await ageatPage.close();
  } finally {
    await context.close();
    await browser.close();

    const outputDir = join(process.cwd(), "output");
    mkdirSync(outputDir, { recursive: true });

    writeFileSync(join(outputDir, "network-trace.json"), JSON.stringify(entries, null, 2), "utf-8");
    writeFileSync(join(outputDir, "network-trace-cookies.json"), JSON.stringify(snapshots, null, 2), "utf-8");

    console.log(`\n[TRACE] Total de requisições capturadas: ${entries.length}`);
    console.log(`[TRACE] Arquivos salvos em: output/`);

    const postEntries = entries.filter((e) => e.method === "POST");
    const hosts = [...new Set(entries.map((e) => new URL(e.url).hostname))];
    console.log(`[TRACE] Hosts: ${hosts.join(", ")}`);
    console.log(`[TRACE] Total de POSTs: ${postEntries.length}`);

    const cookieEntries = entries.filter(
      (e) => e.requestHeaders["cookie"] || Object.keys(e.responseHeaders).some((k) => k === "set-cookie"),
    );
    console.log(`[TRACE] Requests com Cookie header: ${cookieEntries.length}`);
    if (cookieEntries.length > 0) {
      console.log("\n[TRACE] === REQUESTS COM COOKIES ===");
      for (const e of cookieEntries) {
        console.log(`  seq=${e.seq} ${e.method} ${e.url.slice(0, 100)}`);
        if (e.requestHeaders["cookie"]) console.log(`    REQ cookie: ${e.requestHeaders["cookie"].slice(0, 200)}`);
        if (e.responseHeaders["set-cookie"]) console.log(`    RES set-cookie: ${e.responseHeaders["set-cookie"].slice(0, 200)}`);
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  process.exit();
});
