import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Download,
  type Frame,
  type Locator,
  type Page,
  type Request,
  type Response,
} from "playwright";
import { buildClientCertificates, describeClientCertificateError } from "../../shared/sefaz-auth";
import { loginSefazContabilista, openDiaModule } from "../../shared/sefaz-playwright-login";
import { saveFile } from "./downloads";
import { isNonRetriablePortalError, isSessionUnauthorizedError, messageOf } from "./errors";
import { extractPortalError } from "./parser";
import {
  contractFromNetworkPost,
  DemonstrativoApiClient,
  extractFormContractFromDom,
  isInterestingSefazRequest,
  isRealFormContract,
  listCompaniesViaHttp,
  mergeFormContracts,
  saveHttpCaptureSummary,
  type DemonstrativoFormContract,
  type HttpCaptureEvent,
} from "./sefaz-demonstrativo-api";
import { isPdf, isXls } from "./signatures";
import type { Company, Competencia, DownloadResult, ReportFormat, RunConfig } from "./types";

const DEMONSTRATIVO_TRANS_FRAGMENT = "TransId=T34693";
const DEMONSTRATIVO_NAME = /Demonstrativo\s*ICMS\s*Antecipado/i;
export const DEMONSTRATIVO_MODULE_URL =
  "https://portais-fazendario.apps.sefaz.se.gov.br/private/portal-fazendario/modulo?sistema=SIT&menu=T34693";
const LAUNCH_TIMEOUT_MS = 180_000;

type SitFormTarget = {
  host: Page;
  form: Page | Frame;
};

export type DemonstrativoSessionOptions = {
  /** Caminho HAR opcional para mapear requests (probe / diagnostico). */
  recordHarPath?: string;
};

/**
 * Uma sessao Playwright por execucao: login uma vez, lista e baixa N arquivos sem relogar.
 */
export class DemonstrativoPlaywrightSession {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private tempDir = "";
  private api?: DemonstrativoApiClient;
  private httpReady = false;
  private httpCaptureSaved = false;

  private constructor(private readonly config: RunConfig) {}

  static async start(config: RunConfig, options: DemonstrativoSessionOptions = {}): Promise<DemonstrativoPlaywrightSession> {
    const session = new DemonstrativoPlaywrightSession(config);
    await session.open(options);
    return session;
  }

  async listCompanies(): Promise<Company[]> {
    const target = await this.ensureDemonstrativoForm();
    await this.refreshHttpContract(target.form);

    const formPageUrl = typeof target.form.url === "function" ? target.form.url() : undefined;
    try {
      const viaHttp = await listCompaniesViaHttp(this.requireContext().request, {
        formPageUrl,
        contract: this.api?.getContract(),
      });
      if (viaHttp && viaHttp.length > 0) {
        await this.persistContractSummaryIfNeeded([], { via: "list-http", companyCount: viaHttp.length });
        return viaHttp;
      }
    } catch (error) {
      if (isSessionUnauthorizedError(error)) {
        await this.recoverSession();
      }
    }

    const select = await resolveCompanySelect(target.form);
    await waitForCompanyOptions(select, this.config.timeoutMs);
    await this.refreshHttpContract(target.form);
    const companies = await readCompaniesFromSelect(select);
    await this.persistContractSummaryIfNeeded([], { via: "list-dom", companyCount: companies.length });
    return companies;
  }

  async download(company: Company, competencia: Competencia, format: ReportFormat): Promise<DownloadResult> {
    await fs.mkdir(this.tempDir, { recursive: true });

    // Caminho rapido: POST process.jsp + Downloader/Jasper via cookies da sessao.
    // So entra com contrato DOM/network real (nao default legado fragil).
    if (this.httpReady && this.api && isRealFormContract(this.api.getContract())) {
      try {
        const result = await this.api.download(company, competencia, format);
        if (format === "xls" && !isXls(result.bytes)) {
          throw new Error("HTTP retornou bytes que nao parecem XLS.");
        }
        if (format === "pdf" && !isPdf(result.bytes)) {
          throw new Error("HTTP retornou bytes que nao parecem PDF.");
        }
        // Happy path HTTP: nao reabre menu (ganho de tempo entre empresas).
        return { ...result, via: "http" };
      } catch (error) {
        if (isNonRetriablePortalError(error)) {
          // HTTP nao deixa a tela branca — segue sem reopen.
          throw error;
        }
        if (isSessionUnauthorizedError(error)) {
          this.httpReady = false;
          await this.recoverSession();
          return this.downloadAfterRecover(company, competencia, format);
        }
        // cai no fallback UI
      }
    }

    try {
      return await this.downloadViaUi(company, competencia, format);
    } catch (error) {
      if (isSessionUnauthorizedError(error)) {
        await this.recoverSession();
        return this.downloadAfterRecover(company, competencia, format);
      }
      throw error;
    }
  }

  /** Apos recoverSession: tenta HTTP de novo; se nao, UI. */
  private async downloadAfterRecover(
    company: Company,
    competencia: Competencia,
    format: ReportFormat,
  ): Promise<DownloadResult> {
    if (this.httpReady && this.api && isRealFormContract(this.api.getContract())) {
      try {
        const result = await this.api.download(company, competencia, format);
        if (format === "xls" && !isXls(result.bytes)) {
          throw new Error("HTTP retornou bytes que nao parecem XLS.");
        }
        if (format === "pdf" && !isPdf(result.bytes)) {
          throw new Error("HTTP retornou bytes que nao parecem PDF.");
        }
        return { ...result, via: "http" };
      } catch (error) {
        if (isNonRetriablePortalError(error)) {
          throw error;
        }
        // UI fallback
      }
    }
    return this.downloadViaUi(company, competencia, format);
  }

  private async downloadViaUi(
    company: Company,
    competencia: Competencia,
    format: ReportFormat,
  ): Promise<DownloadResult> {
    try {
      const ready = await this.selectCompanyWithPageRefreshRetry(company, competencia, format);
      await this.refreshHttpContract(ready.form);

      const filled = await fillCompetenciaFields(
        this.requireContext(),
        competencia,
        format,
        Math.min(this.config.timeoutMs, 25_000),
        ready,
      );
      const capture = await captureReportFileInstrumented(
        filled.host,
        filled.form,
        this.requireContext(),
        this.tempDir,
        this.config.timeoutMs,
        format,
      );

      if (format === "xls" && !isXls(capture.bytes)) {
        throw new Error("Arquivo baixado nao parece XLS.");
      }
      if (format === "pdf" && !isPdf(capture.bytes)) {
        throw new Error("Arquivo baixado nao parece PDF.");
      }

      const merged = mergeFormContracts(this.api?.getContract(), capture.contract);
      if (merged && isRealFormContract(merged)) {
        this.api?.setContract(merged);
        this.httpReady = true;
      } else {
        await this.refreshHttpContract(filled.form);
      }

      const processPost = capture.events.find(
        (event) => event.kind === "request" && event.method === "POST" && /process\.jsp/i.test(event.url),
      );
      if (processPost) {
        process.stderr.write(
          `[http-map] UI POST ${processPost.url}\n[http-map] body=${(processPost.postData ?? "").slice(0, 500)}\n`,
        );
      } else {
        process.stderr.write("[http-map] UI POST process.jsp nao capturado nos events\n");
      }

      await this.persistContractSummaryIfNeeded(capture.events, {
        company,
        format,
        via: "ui-fallback",
      });

      // Apos PDF/XLS com sucesso: reabre menu (gravação real). Sem dados nao chega aqui.
      await this.reopenDemonstrativoAfterQuery();
      // Token e single-use: renovar contrato a partir do formulario reaberto.
      const refreshed = await this.ensureDemonstrativoForm().catch(() => undefined);
      if (refreshed) {
        await this.refreshHttpContract(refreshed.form);
      }
      return { bytes: capture.bytes, via: "playwright" };
    } catch (error) {
      // Sem dados: form permanece utilizavel — NAO reopen (fluxo gravado).
      if (isNonRetriablePortalError(error)) {
        throw error;
      }
      // Falha tecnica: reabre para nao deixar tela branca no proximo item.
      await this.reopenDemonstrativoAfterQuery().catch(() => undefined);
      throw error;
    }
  }

  /**
   * Seleciona contribuinte e espera Mês/Ano/Formato. Se nao carregar, atualiza a pagina
   * (reload + reabre Demonstrativo) e tenta de novo.
   */
  private async selectCompanyWithPageRefreshRetry(
    company: Company,
    competencia: Competencia,
    format: ReportFormat,
  ): Promise<SitFormTarget> {
    const monthValue = competencia.monthSelectValue;
    const yearValue = String(competencia.year);
    const formatValue = format === "xls" ? "1" : "0";
    const attempts = 3;
    const waitMs = Math.min(this.config.timeoutMs, 12_000);

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const { select, target } = await this.prepareReadyForm();

      await select.selectOption({ value: company.inscricao }).catch(async () => {
        await select.selectOption({ label: company.nome || company.inscricao });
      });
      await select.dispatchEvent("change").catch(() => undefined);
      await select
        .evaluate((el) => {
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        })
        .catch(() => undefined);

      const deadline = Date.now() + waitMs;
      while (Date.now() < deadline) {
        if (await competenciaOptionsReady(target.form, monthValue, yearValue, formatValue)) {
          return target;
        }
        // Formulario pode ter recarregado no iframe apos o change.
        const refreshed = await findSitFormInContext(this.requireContext(), 2_000);
        if (refreshed && (await competenciaOptionsReady(refreshed.form, monthValue, yearValue, formatValue))) {
          return refreshed;
        }
        await delay(300);
      }

      if (attempt >= attempts) {
        break;
      }

      // Retry: atualiza a pagina do modulo e reabre o Demonstrativo.
      const page = this.requirePage();
      await page.reload({ waitUntil: "domcontentloaded", timeout: this.config.timeoutMs }).catch(() => undefined);
      await delay(800);
      await openDemonstrativo(page, this.config, { force: true });
    }

    throw new Error(
      `Apos selecionar ${company.inscricao}, Mês/Ano/Formato nao carregaram opcoes ` +
        `(esperado mes=${monthValue} ano=${yearValue} formato=${formatValue}) mesmo apos atualizar a pagina.`,
    );
  }

  private async refreshHttpContract(form: Page | Frame): Promise<void> {
    const context = this.requireContext();
    if (!this.api) {
      this.api = new DemonstrativoApiClient(context.request);
    }
    const fromDom = await extractFormContractFromDom(form);
    if (!fromDom) {
      return;
    }

    const current = isRealFormContract(this.api.getContract()) ? this.api.getContract() : undefined;
    // Apos Ok o token e de uso unico: prioriza token fresco do DOM mesmo com contrato network.
    if (current && fromDom.baseFields.token) {
      const submitUrl = (() => {
        try {
          const submit = new URL(current.submitUrl || fromDom.submitUrl);
          submit.searchParams.set("token", fromDom.baseFields.token!);
          return submit.toString();
        } catch {
          return fromDom.submitUrl;
        }
      })();
      this.api.setContract({
        submitUrl,
        baseFields: {
          ...current.baseFields,
          ...fromDom.baseFields,
          token: fromDom.baseFields.token,
        },
        capturedAt: new Date().toISOString(),
        source: current.source === "network" || fromDom.source === "dom" ? current.source : fromDom.source,
      });
      this.httpReady = true;
      return;
    }

    const merged = mergeFormContracts(current, fromDom);
    if (merged && isRealFormContract(merged)) {
      this.api.setContract(merged);
      this.httpReady = true;
    }
    // Sem contrato DOM/network real: nao marcar httpReady (evita POST fragil + 401).
  }

  private async persistContractSummaryIfNeeded(
    events: HttpCaptureEvent[],
    meta: Record<string, unknown>,
  ): Promise<void> {
    const contract = this.api?.getContract();
    const real = isRealFormContract(contract) ? contract : undefined;
    if (!real && events.length === 0) {
      return;
    }
    // Permite sobrescrever o summary do list com o do 1o Ok UI (events/network).
    const richer = events.length > 0 || real?.source === "network";
    if (this.httpCaptureSaved && !richer) {
      return;
    }
    await saveHttpCaptureSummary(events, real, meta).catch(() => undefined);
    this.httpCaptureSaved = true;
  }

  /**
   * Reloga certificado + DIA + Demonstrativo quando a sessao cai (401 no modulo).
   */
  private async recoverSession(): Promise<void> {
    this.httpReady = false;
    const context = this.requireContext();
    const page = this.requirePage();

    for (const extra of context.pages()) {
      if (extra === page || extra.isClosed()) {
        continue;
      }
      await extra.close().catch(() => undefined);
    }

    this.page = (await loginSefazContabilista(page, this.config)) as Page;
    await openDiaModule(this.page, this.config.timeoutMs);
    const target = await openDemonstrativo(this.page, this.config, { force: true });
    await this.refreshHttpContract(target.form);
  }

  /** Expõe o context autenticado para probes/API via context.request. */
  getRequestContext(): BrowserContext {
    return this.requireContext();
  }

  getPage(): Page {
    return this.requirePage();
  }

  /** True quando ha contrato DOM/network real (download HTTP seguro). */
  isHttpReady(): boolean {
    return this.httpReady && Boolean(this.api && isRealFormContract(this.api.getContract()));
  }

  getFormContract(): DemonstrativoFormContract | undefined {
    return this.api?.getContract();
  }

  /**
   * Um Ok via UI para capturar o POST real (network) sem tentar HTTP antes.
   * Necessario porque o contrato so-DOM ainda pode invalidar a sessao no portal novo.
   */
  async bootstrapHttpFromUi(
    company: Company,
    competencia: Competencia,
    format: ReportFormat = "pdf",
  ): Promise<DownloadResult> {
    this.httpReady = false;
    return this.downloadViaUi(company, competencia, format);
  }

  /**
   * Download estrito via HTTP (context.request). Sem clicar Ok na UI.
   */
  async downloadHttpOnly(
    company: Company,
    competencia: Competencia,
    format: ReportFormat,
  ): Promise<DownloadResult> {
    if (!this.api || !isRealFormContract(this.api.getContract())) {
      throw new Error(
        "downloadHttpOnly: contrato HTTP ausente (source deve ser dom|network, nao legacy-default).",
      );
    }

    const target = await this.ensureDemonstrativoForm();
    await this.refreshHttpContract(target.form);

    const result = await this.api.download(company, competencia, format);
    if (format === "xls" && !isXls(result.bytes)) {
      throw new Error("downloadHttpOnly: bytes nao parecem XLS.");
    }
    if (format === "pdf" && !isPdf(result.bytes)) {
      throw new Error("downloadHttpOnly: bytes nao parecem PDF.");
    }
    return { ...result, via: "http" };
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
    this.api = undefined;
  }

  private async open(options: DemonstrativoSessionOptions): Promise<void> {
    this.tempDir = path.resolve(this.config.outDir, ".tmp-playwright");
    await fs.mkdir(this.tempDir, { recursive: true });

    process.stderr.write("[session] abrindo browser...\n");
    this.browser = await launchBrowser(Boolean(this.config.headless));
    try {
      process.stderr.write("[session] criando context com certificado...\n");
      this.context = await this.browser.newContext({
        acceptDownloads: true,
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        viewport: { width: 1280, height: 900 },
        clientCertificates: buildClientCertificates(this.config.certificate),
        ...(options.recordHarPath
          ? {
              recordHar: {
                path: options.recordHarPath,
                mode: "minimal" as const,
                content: "omit" as const,
              },
            }
          : {}),
      });
    } catch (error) {
      await this.browser.close().catch(() => undefined);
      throw new Error(describeClientCertificateError(error));
    }

    this.context.setDefaultTimeout(this.config.timeoutMs);
    this.api = new DemonstrativoApiClient(this.context.request);
    process.stderr.write("[session] login Portal Fazendario...\n");
    const entryPage = await this.context.newPage();
    this.page = (await loginSefazContabilista(entryPage, this.config)) as Page;
    process.stderr.write("[session] abrindo modulo DIA...\n");
    await openDiaModule(this.page, this.config.timeoutMs);
    process.stderr.write("[session] abrindo Demonstrativo...\n");
    const target = await openDemonstrativo(this.page, this.config);
    await this.refreshHttpContract(target.form);
    process.stderr.write(`[session] pronta (httpReady=${this.httpReady})\n`);
  }

  private async ensureDemonstrativoForm(): Promise<SitFormTarget> {
    const page = this.requirePage();
    const existing = await findSitFormInContext(this.requireContext(), 2_000);
    if (existing && (await formIsReadyForFill(existing.form))) {
      return existing;
    }
    return openDemonstrativo(page, this.config, { force: true });
  }

  /**
   * Garante formulario com opcoes de contribuinte. Se apos reopen o select estiver
   * vazio, reclica o menu Demonstrativo uma vez e tenta de novo.
   */
  private async prepareReadyForm(): Promise<{ target: SitFormTarget; select: Locator }> {
    let target: SitFormTarget;
    try {
      target = await this.ensureDemonstrativoForm();
    } catch (error) {
      if (isSessionUnauthorizedError(error)) {
        await this.recoverSession();
        target = await this.ensureDemonstrativoForm();
      } else {
        throw error;
      }
    }
    let select = await resolveCompanySelect(target.form);

    try {
      await waitForCompanyOptions(select, this.config.timeoutMs);
      return { target, select };
    } catch (firstError) {
      try {
        await openDemonstrativo(this.requirePage(), this.config, { force: true });
      } catch (error) {
        if (isSessionUnauthorizedError(error)) {
          await this.recoverSession();
        } else {
          throw error;
        }
      }
      target = (await findSitFormInContext(this.requireContext(), this.config.timeoutMs)) ??
        (await openDemonstrativo(this.requirePage(), this.config, { force: true }));
      select = await resolveCompanySelect(target.form);
      try {
        await waitForCompanyOptions(select, this.config.timeoutMs);
        return { target, select };
      } catch {
        throw firstError instanceof Error
          ? firstError
          : new Error("Select de Contribuinte sem opcoes apos reabrir o Demonstrativo.");
      }
    }
  }

  /**
   * Apos Ok a area central fica branca — e obrigatorio reclicar o menu Demonstrativo
   * (ou reabrir a URL do modulo) antes do proximo item. Sem novo login.
   */
  private async reopenDemonstrativoAfterQuery(): Promise<void> {
    const context = this.requireContext();
    const page = this.requirePage();

    for (const extra of context.pages()) {
      if (extra === page || extra.isClosed()) {
        continue;
      }
      if (/popup\.jsp|JasperPDF/i.test(extra.url())) {
        await extra.close().catch(() => undefined);
      }
    }

    try {
      await assertPageAuthenticated(page);
      await openDemonstrativo(page, this.config, { force: true });
    } catch (error) {
      if (isSessionUnauthorizedError(error)) {
        await this.recoverSession();
        return;
      }
      // goto cego no modulo as vezes cai em 401 — tenta recover uma vez
      if (/Formulario do Demonstrativo nao apareceu|401|Unauthorized/i.test(messageOf(error))) {
        await this.recoverSession();
        return;
      }
      throw error;
    }

    // Espera opcoes uteis ja no reopen para o proximo download nao travar.
    const target = await findSitFormInContext(context, this.config.timeoutMs);
    if (target) {
      const select = await resolveCompanySelect(target.form).catch(() => undefined);
      if (select) {
        await waitForCompanyOptions(select, this.config.timeoutMs).catch(() => undefined);
      }
    }
  }

  private requireContext(): BrowserContext {
    if (!this.context) {
      throw new Error("Sessao Playwright sem context.");
    }
    return this.context;
  }

  private requirePage(): Page {
    if (!this.page || this.page.isClosed()) {
      throw new Error("Sessao Playwright sem pagina do portal.");
    }
    return this.page;
  }
}

/** @deprecated Prefer DemonstrativoPlaywrightSession — mantido para scripts pontuais. */
export async function listCompaniesViaPlaywright(config: RunConfig): Promise<Company[]> {
  const session = await DemonstrativoPlaywrightSession.start(config);
  try {
    return await session.listCompanies();
  } finally {
    await session.close();
  }
}

/** @deprecated Prefer DemonstrativoPlaywrightSession. */
export async function downloadViaPlaywright(
  config: RunConfig,
  company: Company,
  competencia: Competencia,
  format: ReportFormat,
): Promise<DownloadResult> {
  const session = await DemonstrativoPlaywrightSession.start(config);
  try {
    return await session.download(company, competencia, format);
  } finally {
    await session.close();
  }
}

export async function saveFallbackResult(filePath: string, result: DownloadResult): Promise<void> {
  await saveFile(filePath, result.bytes);
}

function chromiumLaunchArgs(): string[] {
  const args = [
    "--window-position=80,80",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-default-apps",
    "--disable-sync",
  ];
  const disableFeatures =
    process.platform === "win32" ? "CalculateNativeWinOcclusion,ChromeWhatsNew" : "ChromeWhatsNew";
  args.push(`--disable-features=${disableFeatures}`);
  if (process.platform === "win32") {
    args.push("--disable-backgrounding-occluded-windows");
  }
  return args;
}

async function launchBrowser(headless: boolean): Promise<Browser> {
  // Client certificates exigem Chromium completo; headless shell trava/falha no Windows.
  process.env.PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL = "0";

  const args = chromiumLaunchArgs();
  const opts = { args, timeout: LAUNCH_TIMEOUT_MS };
  const preferred = (process.env.SEFAZ_BROWSER ?? "").trim().toLowerCase();

  const tryLaunch = async (label: string, launchOpts: Parameters<typeof chromium.launch>[0]) => {
    const started = Date.now();
    process.stderr.write(`[playwright] launch ${label}...\n`);
    const browser = await chromium.launch(launchOpts);
    process.stderr.write(`[playwright] launch ${label} ok (${Date.now() - started}ms)\n`);
    return browser;
  };

  if (preferred === "msedge") {
    return tryLaunch("msedge", { ...opts, headless, channel: "msedge" });
  }
  if (preferred === "chrome") {
    return tryLaunch("chrome", { ...opts, headless, channel: "chrome" });
  }

  try {
    return await tryLaunch("chromium", { ...opts, headless });
  } catch (firstError) {
    if (process.platform === "win32" && !headless) {
      try {
        return await tryLaunch("msedge-fallback", { ...opts, headless: false, channel: "msedge" });
      } catch {
        /* keep first */
      }
    }
    throw firstError;
  }
}

/** Espera curta pelo form; se #servico ficar branco, reload em vez de esperar timeoutMs. */
const OPEN_DEMO_FORM_WAIT_MS = 8_000;
const OPEN_DEMO_MAX_ATTEMPTS = 3;

async function openDemonstrativo(
  page: Page,
  config: RunConfig,
  options: { force?: boolean } = {},
): Promise<SitFormTarget> {
  const context = page.context();
  if (!options.force) {
    const existing = await findSitFormInContext(context, 2_000);
    if (existing && (await formIsReadyForFill(existing.form))) {
      return existing;
    }
  }

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= OPEN_DEMO_MAX_ATTEMPTS; attempt += 1) {
    try {
      if (attempt === 1) {
        try {
          await clickDemonstrativoMenu(page, config.timeoutMs);
        } catch {
          await page.goto(DEMONSTRATIVO_MODULE_URL, {
            waitUntil: "domcontentloaded",
            timeout: config.timeoutMs,
          });
          await assertPageAuthenticated(page);
        }
      } else {
        process.stderr.write(
          `[session] Demonstrativo em branco; atualizando pagina (tentativa ${attempt}/${OPEN_DEMO_MAX_ATTEMPTS})...\n`,
        );
        await page.reload({ waitUntil: "domcontentloaded", timeout: config.timeoutMs }).catch(() => undefined);
        await delay(800);
        try {
          await clickDemonstrativoMenu(page, config.timeoutMs);
        } catch {
          await page.goto(DEMONSTRATIVO_MODULE_URL, {
            waitUntil: "domcontentloaded",
            timeout: config.timeoutMs,
          });
          await assertPageAuthenticated(page);
        }
      }

      await delay(600);
      let found = await findSitFormInContext(context, OPEN_DEMO_FORM_WAIT_MS);
      if (!found || !(await formHasCompanySelect(found.form))) {
        // Segunda chance na mesma tentativa: goto direto do modulo.
        await page.goto(DEMONSTRATIVO_MODULE_URL, {
          waitUntil: "domcontentloaded",
          timeout: config.timeoutMs,
        });
        await assertPageAuthenticated(page);
        await delay(600);
        found = await findSitFormInContext(context, OPEN_DEMO_FORM_WAIT_MS);
      }

      if (found) {
        await assertPageAuthenticated(found.host).catch(() => undefined);
      }
      if (!found || !(await formHasCompanySelect(found.form))) {
        throw new Error("Formulario do Demonstrativo nao apareceu (area em branco).");
      }

      const select = await resolveCompanySelect(found.form).catch(() => undefined);
      if (select) {
        await waitForCompanyOptions(select, Math.min(config.timeoutMs, OPEN_DEMO_FORM_WAIT_MS)).catch(
          async () => {
            await clickDemonstrativoMenu(page, config.timeoutMs).catch(() => undefined);
            await delay(600);
            const again = await findSitFormInContext(context, OPEN_DEMO_FORM_WAIT_MS);
            if (!again) {
              return;
            }
            const selectAgain = await resolveCompanySelect(again.form);
            await waitForCompanyOptions(selectAgain, Math.min(config.timeoutMs, OPEN_DEMO_FORM_WAIT_MS));
            found = again;
          },
        );
      }

      await delay(300);
      const stable = await findSitFormInContext(context, 3_000);
      if (stable && (await formHasCompanySelect(stable.form))) {
        return stable;
      }
      return found;
    } catch (error) {
      if (isSessionUnauthorizedError(error)) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= OPEN_DEMO_MAX_ATTEMPTS) {
        break;
      }
    }
  }

  await assertPageAuthenticated(page).catch(() => undefined);
  const urls = context.pages().map((p) => (p.isClosed() ? "(closed)" : p.url())).join(" | ");
  throw new Error(
    `Formulario do Demonstrativo nao apareceu apos ${OPEN_DEMO_MAX_ATTEMPTS} tentativas` +
      `${lastError ? ` (${lastError.message})` : ""}. Paginas: ${urls}`,
  );
}

async function clickDemonstrativoMenu(page: Page, timeoutMs: number): Promise<void> {
  const popupPromise = page.waitForEvent("popup", { timeout: Math.min(timeoutMs, 5_000) }).catch(() => undefined);
  const candidates = [
    page.locator(`a[href*="${DEMONSTRATIVO_TRANS_FRAGMENT}"]`),
    page.getByRole("link", { name: DEMONSTRATIVO_NAME }),
    page.getByRole("menuitem", { name: DEMONSTRATIVO_NAME }),
    page.getByRole("button", { name: DEMONSTRATIVO_NAME }),
    page.getByRole("treeitem", { name: DEMONSTRATIVO_NAME }),
    page.locator(".p-treenode-label, .menu-item, [class*='menu']").filter({ hasText: DEMONSTRATIVO_NAME }),
    page.getByText(DEMONSTRATIVO_NAME),
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const target = candidate.first();
      if ((await target.count()) === 0) {
        continue;
      }
      await target.click({ timeout: Math.min(timeoutMs, 10_000) });
      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
      }
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Nao foi possivel clicar em 'Demonstrativo ICMS Antecipado' no menu.");
}

async function findSitFormInContext(context: BrowserContext, timeoutMs: number): Promise<SitFormTarget | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // Fluxo real (gravação Playwright): formulario vive em #servico contentFrame.
    for (const host of context.pages()) {
      if (host.isClosed()) {
        continue;
      }
      const servico = await resolveServicoFrame(host);
      if (servico && (await formHasCompanySelect(servico))) {
        return { host, form: servico };
      }
    }

    const scored: Array<SitFormTarget & { score: number }> = [];

    for (const host of context.pages()) {
      if (host.isClosed()) {
        continue;
      }
      try {
        const hostScore = await scoreFormRoot(host);
        if (hostScore > 0) {
          scored.push({ host, form: host, score: hostScore });
        }
        for (const frame of host.frames()) {
          const frameScore = await scoreFormRoot(frame);
          if (frameScore > 0) {
            scored.push({ host, form: frame, score: frameScore + (/servico/i.test(frame.name() || frame.url()) ? 10 : 0) });
          }
        }
      } catch {
        // pagina/frame fechou no meio da varredura
      }
    }

    scored.sort((a, b) => b.score - a.score);
    if (scored[0]) {
      return { host: scored[0].host, form: scored[0].form };
    }
    await delay(300);
  }
  return undefined;
}

/** Iframe #servico do Portal Fazendario (formulario SIT). */
async function resolveServicoFrame(host: Page): Promise<Frame | undefined> {
  try {
    const handle = await host.locator("#servico").elementHandle({ timeout: 1_500 }).catch(() => null);
    if (handle) {
      const frame = await handle.contentFrame();
      if (frame) {
        return frame;
      }
    }
  } catch {
    /* fallback por name/url */
  }
  return host.frames().find((frame) => {
    const name = frame.name() || "";
    const url = frame.url() || "";
    return /^servico$/i.test(name) || /servico|process\.jsp|T34693/i.test(url);
  });
}

async function scoreFormRoot(root: Page | Frame): Promise<number> {
  let score = 0;
  try {
    const body = (await root.locator("body").innerText({ timeout: 1_000 }).catch(() => "")) ?? "";
    // Tela branca pos-Ok ("EXCEL gerado...") nao conta como formulario.
    if (/EXCEL gerado com sucesso/i.test(body) && !/Filtrar por CNPJ|Contribuinte e Refer/i.test(body)) {
      return 0;
    }
    if (/Extrato de Demonstrativo/i.test(body)) {
      score += 5;
    }
    if (/Filtrar por CNPJ/i.test(body)) {
      score += 4;
    }
    if (/Contribuinte e Refer/i.test(body)) {
      score += 2;
    }
    if ((await root.locator("#cdPessoaLookup").count().catch(() => 0)) > 0) {
      score += 2;
    }
    if ((await companySelectCandidate(root).count().catch(() => 0)) > 0) {
      score += 3;
    }
    // URL sozinha nao basta (tela branca ainda tem menu=T34693).
    if (score === 0) {
      return 0;
    }
    if (/menu=T34693/i.test(root.url())) {
      score += 1;
    }
  } catch {
    return 0;
  }
  return score;
}

async function formHasCompanySelect(form: Page | Frame): Promise<boolean> {
  try {
    if ((await form.locator("#cdPessoaLookup").count()) > 0) {
      return true;
    }
    if ((await companySelectCandidate(form).count()) > 0) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function formIsReadyForFill(form: Page | Frame): Promise<boolean> {
  if (!(await formHasCompanySelect(form))) {
    return false;
  }
  try {
    const select = await resolveCompanySelect(form);
    const values = await select
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value.trim()).filter(Boolean),
      )
      .catch(() => [] as string[]);
    return values.length > 0;
  } catch {
    return false;
  }
}

function companySelectCandidate(root: Page | Frame): Locator {
  return root
    .locator("#cdPessoaLookup")
    .or(root.getByLabel(/^Contribuinte/i))
    .or(root.locator("xpath=//label[contains(normalize-space(.),'Contribuinte')]/following::select[1]"));
}

async function resolveCompanySelect(form: Page | Frame): Promise<Locator> {
  const candidates: Locator[] = [
    form.locator("#cdPessoaLookup"),
    form.getByLabel(/^Contribuinte/i),
    form.locator("xpath=//label[contains(normalize-space(.),'Contribuinte')]/following::select[1]"),
  ];

  for (const candidate of candidates) {
    if ((await candidate.count().catch(() => 0)) > 0) {
      return candidate.first();
    }
  }

  const selects = form.locator("select");
  const count = await selects.count();
  for (let i = 0; i < count; i += 1) {
    const select = selects.nth(i);
    const options = await select.locator("option").count().catch(() => 0);
    if (options > 0) {
      return select;
    }
  }

  throw new Error("Select de Contribuinte nao encontrado no formulario do Demonstrativo.");
}

async function waitForCompanyOptions(select: Locator, timeoutMs: number): Promise<void> {
  await select.waitFor({ state: "attached", timeout: timeoutMs });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const values = await select
      .locator("option")
      .evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value.trim())
          .filter(Boolean),
      )
      .catch(() => [] as string[]);
    if (values.length > 0) {
      return;
    }
    await delay(400);
  }
  throw new Error(
    "Select de Contribuinte carregou sem opcoes. No portal novo, confira se a lista aparece ao abrir o combo.",
  );
}

async function readCompaniesFromSelect(select: Locator): Promise<Company[]> {
  const companies = await select.locator("option").evaluateAll((options) =>
    options
      .map((option) => {
        const html = option as HTMLOptionElement;
        const inscricao = html.value.trim();
        const label = html.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const nome = label.replace(new RegExp(`^${inscricao}\\s*-\\s*`), "").trim();
        return inscricao ? { inscricao, nome: nome || label || inscricao } : undefined;
      })
      .filter((company): company is { inscricao: string; nome: string } => Boolean(company)),
  );
  if (companies.length === 0) {
    throw new Error("Nenhuma empresa com value valido no select de Contribuinte.");
  }
  return companies;
}

async function competenciaOptionsReady(
  root: Page | Frame,
  monthValue: string,
  yearValue: string,
  formatValue: string,
): Promise<boolean> {
  const mes = mesLocator(root);
  const ano = root.locator("#nrAno, select[name='nrAno']");
  const tipo = root.locator("#tpFormato, select[name='tpFormato']");
  if ((await mes.count().catch(() => 0)) === 0) {
    return false;
  }
  if ((await ano.count().catch(() => 0)) === 0) {
    return false;
  }
  if ((await tipo.count().catch(() => 0)) === 0) {
    return false;
  }
  const monthReady = (await mes.locator(`option[value="${monthValue}"]`).count().catch(() => 0)) > 0;
  const yearReady = (await ano.locator(`option[value="${yearValue}"]`).count().catch(() => 0)) > 0;
  const formatReady = (await tipo.locator(`option[value="${formatValue}"]`).count().catch(() => 0)) > 0;
  return monthReady && yearReady && formatReady;
}

function mesLocator(root: Page | Frame): Locator {
  return root.locator("#nrMesDia, select[name='nrMesDia']").first();
}

async function fillCompetenciaFields(
  context: BrowserContext,
  competencia: Competencia,
  format: ReportFormat,
  timeoutMs: number,
  preferred?: SitFormTarget,
): Promise<SitFormTarget> {
  const monthValue = competencia.monthSelectValue;
  const yearValue = String(competencia.year);
  const formatValue = format === "xls" ? "1" : "0";
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  const tryFill = async (host: Page, root: Page | Frame): Promise<SitFormTarget | undefined> => {
    if (!(await competenciaOptionsReady(root, monthValue, yearValue, formatValue))) {
      return undefined;
    }

    const mes = mesLocator(root);
    const ano = root.locator("#nrAno, select[name='nrAno']").first();
    const tipo = root.locator("#tpFormato, select[name='tpFormato']").first();

    await mes.selectOption(monthValue);
    await delay(150);
    await ano.selectOption(yearValue);
    await delay(150);
    await tipo.selectOption(formatValue);
    await delay(150);

    const selectedMonth = await mes.inputValue();
    const selectedYear = await ano.inputValue();
    const selectedFormat = await tipo.inputValue();
    if (selectedMonth !== monthValue || selectedYear !== yearValue || selectedFormat !== formatValue) {
      await mes.selectOption({ value: monthValue });
      await ano.selectOption({ value: yearValue });
      await tipo.selectOption({ value: formatValue });
    }

    const confirmedMonth = await mes.inputValue();
    const confirmedYear = await ano.inputValue();
    const confirmedFormat = await tipo.inputValue();
    if (confirmedMonth !== monthValue || confirmedYear !== yearValue || confirmedFormat !== formatValue) {
      throw new Error(
        `Falha ao confirmar selects: mes=${confirmedMonth} ano=${confirmedYear} formato=${confirmedFormat} ` +
          `(esperado mes=${monthValue} ano=${yearValue} formato=${formatValue}).`,
      );
    }

    return { host, form: root };
  };

  while (Date.now() < deadline) {
    if (preferred && !preferred.host.isClosed()) {
      try {
        const filled = await tryFill(preferred.host, preferred.form);
        if (filled) {
          return filled;
        }
      } catch (error) {
        lastError = error;
      }
    }

    for (const host of context.pages()) {
      if (host.isClosed()) {
        continue;
      }
      for (const root of [host as Page | Frame, ...host.frames().filter((frame) => frame !== host.mainFrame())]) {
        try {
          const filled = await tryFill(host, root);
          if (filled) {
            return filled;
          }
        } catch (error) {
          lastError = error;
        }
      }
    }
    await delay(400);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        `Campos #nrMesDia/#nrAno/#tpFormato nao ficaram prontos para preencher ` +
          `(mes=${monthValue}, ano=${yearValue}, formato=${formatValue}).`,
      );
}

async function clickOk(form: Page | Frame): Promise<void> {
  const ok = form
    .locator("#okButton")
    .or(form.getByRole("button", { name: /^Ok$/i }))
    .or(form.locator("input[type='button'][value='Ok'], input[type='submit'][value='Ok']"))
    .or(form.locator("button", { hasText: /^Ok$/i }))
    .first();
  await ok.click();
}

/**
 * Detecta 401 / pagina de erro de sessao no host atual.
 */
async function assertPageAuthenticated(page: Page): Promise<void> {
  if (page.isClosed()) {
    throw new Error("Unauthorized (401): pagina fechada.");
  }
  const url = page.url();
  const title = await page.title().catch(() => "");
  const bodyText = await page.locator("body").innerText({ timeout: 3_000 }).catch(() => "");
  const sample = `${title}\n${bodyText}`.slice(0, 2_000);
  if (
    /HTTP Status 401|401 Unauthorized|Unauthorized|Access is denied|Invalid credentials/i.test(sample) ||
    (/Server Error/i.test(sample) && /401/i.test(sample))
  ) {
    throw new Error(`Unauthorized (401) em ${url}: ${sample.replace(/\s+/g, " ").slice(0, 180)}`);
  }
}

/**
 * Apos Ok, o portal pode mostrar fontMessageError ("Sem dados para gerar o relatorio...")
 * em vez de abrir popup/download. Detecta cedo para nao esperar o timeout cheio.
 * Nao usa locator.or() entre form e host — frames diferentes quebram o Playwright.
 */
async function waitForPortalMessageError(
  host: Page,
  form: Page | Frame,
  timeoutMs: number,
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  const selector = "font.fontMessageError, .fontMessageError, [class*='fontMessageError']";

  while (Date.now() < deadline) {
    for (const root of [form, host] as Array<Page | Frame>) {
      const loc = root.locator(selector).first();
      const visible = await loc.isVisible().catch(() => false);
      if (visible) {
        const text = (await loc.innerText().catch(() => "")).trim();
        if (text) {
          return text;
        }
      }
      const html = await root.content().catch(() => "");
      const fromHtml = extractPortalError(html);
      if (fromHtml) {
        return fromHtml;
      }
    }

    await delay(250);
  }

  return undefined;
}

const SECURITY_ORIGIN = "https://security.sefaz.se.gov.br";

/**
 * popup.jsp#/iBusinessPortal/jsp/templates/Pdf/JasperPDF.jsp?... → URL absoluta do PDF.
 */
export function extractJasperPdfUrl(pageUrl: string): string | undefined {
  try {
    const parsed = new URL(pageUrl);
    const hash = parsed.hash.replace(/^#/, "");
    if (hash && /JasperPDF\.jsp/i.test(hash)) {
      const path = hash.startsWith("/") ? hash : `/${hash}`;
      return `${parsed.origin}${path}`;
    }
  } catch {
    /* fallback regex */
  }

  const hashMatch = pageUrl.match(/#(\/?iBusinessPortal\/jsp\/templates\/Pdf\/JasperPDF\.jsp[^#]*)/i);
  if (hashMatch?.[1]) {
    const path = hashMatch[1].startsWith("/") ? hashMatch[1] : `/${hashMatch[1]}`;
    return `${SECURITY_ORIGIN}${path}`;
  }

  if (/JasperPDF\.jsp/i.test(pageUrl) && !/popup\.jsp/i.test(pageUrl)) {
    return pageUrl.split("#")[0];
  }

  return undefined;
}

/**
 * Captura PDF/XLS apos Ok, instrumentando requests para mapear o contrato HTTP.
 */
async function captureReportFileInstrumented(
  host: Page,
  form: Page | Frame,
  context: BrowserContext,
  tempDir: string,
  timeoutMs: number,
  format: ReportFormat,
): Promise<{ bytes: Uint8Array; events: HttpCaptureEvent[]; contract?: DemonstrativoFormContract }> {
  const events: HttpCaptureEvent[] = [];
  let contract: DemonstrativoFormContract | undefined;

  const onRequest = (request: Request): void => {
    if (!isInterestingSefazRequest(request) && request.method() !== "POST") {
      return;
    }
    if (!/sefaz\.se\.gov\.br/i.test(request.url())) {
      return;
    }
    const postData = request.postData() ?? undefined;
    if (request.method() === "POST" || isInterestingSefazRequest(request)) {
      events.push({
        kind: "request",
        method: request.method(),
        url: request.url(),
        postData: postData?.slice(0, 6_000),
      });
    }
    if (request.method() === "POST" && /process\.jsp/i.test(request.url())) {
      contract = contractFromNetworkPost(request.url(), postData) ?? contract;
    }
  };

  const onResponse = (response: Response): void => {
    const request = response.request();
    const ct = response.headers()["content-type"] ?? "";
    if (!isInterestingSefazRequest(request) && !/pdf|excel|octet|spreadsheet/i.test(ct)) {
      return;
    }
    events.push({
      kind: "response",
      method: request.method(),
      url: response.url(),
      status: response.status(),
      contentType: ct,
    });
  };

  host.on("request", onRequest);
  host.on("response", onResponse);
  context.on("request", onRequest);
  context.on("response", onResponse);
  try {
    const bytes = await captureReportFile(host, form, context, tempDir, timeoutMs, format);
    return { bytes, events, contract };
  } finally {
    host.off("request", onRequest);
    host.off("response", onResponse);
    context.off("request", onRequest);
    context.off("response", onResponse);
  }
}

/**
 * Captura PDF/XLS apos Ok.
 * PDF: popup keycloak/popup.jsp#...JasperPDF.jsp → GET do JasperPDF com cookies.
 * XLS: download / Downloader.jsp / tela "EXCEL gerado com sucesso!".
 */
async function captureReportFile(
  host: Page,
  form: Page | Frame,
  context: BrowserContext,
  tempDir: string,
  timeoutMs: number,
  format: ReportFormat,
): Promise<Uint8Array> {
  const wantPdf = format === "pdf";

  const downloadFromHost = host.waitForEvent("download", { timeout: timeoutMs }).catch(() => undefined);
  const popupPromise = host.waitForEvent("popup", { timeout: timeoutMs }).catch(() => undefined);
  const newPagePromise = context.waitForEvent("page", { timeout: timeoutMs }).catch(() => undefined);
  const responsePromise = host
    .waitForResponse((response) => matchesReportResponse(response, wantPdf), { timeout: timeoutMs })
    .catch(() => undefined);

  await clickOk(form);

  // Erro de negocio (sem dados) aparece em ~1–3s; nao esperar 90s de download.
  const portalErrorPromise = waitForPortalMessageError(host, form, Math.min(timeoutMs, 12_000));

  const successPromise = (async (): Promise<Uint8Array> => {
    if (wantPdf) {
      const popup = (await popupPromise) ?? (await newPagePromise);
      if (popup) {
        const pdfBytes = await readPdfFromJasperPopup(popup, timeoutMs);
        await popup.close().catch(() => undefined);
        if (pdfBytes && isPdf(pdfBytes)) {
          return pdfBytes;
        }
      }

      for (const page of context.pages()) {
        if (page.isClosed() || page === host) {
          continue;
        }
        if (!/popup\.jsp|JasperPDF/i.test(page.url())) {
          continue;
        }
        const pdfBytes = await readPdfFromJasperPopup(page, Math.min(timeoutMs, 20_000));
        await page.close().catch(() => undefined);
        if (pdfBytes && isPdf(pdfBytes)) {
          return pdfBytes;
        }
      }
    }

    const download = await downloadFromHost;
    if (download) {
      const bytes = await readDownload(download, tempDir);
      if (wantPdf ? isPdf(bytes) : isXls(bytes) || bytes.byteLength > 8) {
        return bytes;
      }
    }

    if (!wantPdf) {
      const extraPage = await newPagePromise;
      if (extraPage) {
        const fromPage = await readBytesFromPage(extraPage, tempDir, timeoutMs, false).catch(() => undefined);
        if (fromPage && (isXls(fromPage) || fromPage.byteLength > 8)) {
          return fromPage;
        }
      }

      const successVisible = await host
        .getByText(/EXCEL gerado com sucesso/i)
        .isVisible({ timeout: Math.min(timeoutMs, 8_000) })
        .catch(() => false);
      if (successVisible) {
        const lateDownload = await host
          .waitForEvent("download", { timeout: Math.min(timeoutMs, 10_000) })
          .catch(() => undefined);
        if (lateDownload) {
          return readDownload(lateDownload, tempDir);
        }
      }
    }

    const response = await responsePromise;
    if (response) {
      const bytes = new Uint8Array(await response.body());
      if (wantPdf ? isPdf(bytes) : isXls(bytes) || bytes.byteLength > 0) {
        return bytes;
      }
    }

    const lateResponse = await host
      .waitForResponse((response) => matchesReportResponse(response, wantPdf), {
        timeout: Math.min(timeoutMs, 15_000),
      })
      .catch(() => undefined);
    if (lateResponse) {
      const bytes = new Uint8Array(await lateResponse.body());
      if (wantPdf ? isPdf(bytes) : bytes.byteLength > 0) {
        return bytes;
      }
    }

    throw new Error(
      wantPdf
        ? "PDF: nao foi possivel obter bytes do popup JasperPDF.jsp (keycloak/popup.jsp)."
        : "Excel: nao houve download/Downloader apos Ok (tela pode ter ficado em 'EXCEL gerado com sucesso!').",
    );
  })();

  const raced = await Promise.race([
    successPromise.then((bytes) => ({ kind: "ok" as const, bytes })),
    portalErrorPromise.then((message) =>
      message ? { kind: "portal" as const, message } : { kind: "none" as const },
    ),
  ]);

  if (raced.kind === "portal") {
    throw new Error(raced.message);
  }
  if (raced.kind === "ok") {
    return raced.bytes;
  }

  // Portal watch esgotou sem mensagem: segue aguardando o download.
  return successPromise;
}

async function readPdfFromJasperPopup(page: Page, timeoutMs: number): Promise<Uint8Array | undefined> {
  const responsePromise = page
    .waitForResponse(
      (response) => /JasperPDF\.jsp/i.test(response.url()) && response.status() >= 200 && response.status() < 400,
      { timeout: timeoutMs },
    )
    .catch(() => undefined);

  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);

  const deadline = Date.now() + timeoutMs;
  let jasperUrl: string | undefined;
  while (Date.now() < deadline) {
    jasperUrl = extractJasperPdfUrl(page.url());
    if (jasperUrl) {
      break;
    }
    await delay(200);
  }

  if (jasperUrl) {
    const response = await page.request.get(jasperUrl, { timeout: timeoutMs }).catch(() => undefined);
    if (response) {
      const bytes = new Uint8Array(await response.body());
      if (isPdf(bytes)) {
        return bytes;
      }
    }
  }

  const jasperResponse = await responsePromise;
  if (jasperResponse) {
    const bytes = new Uint8Array(await jasperResponse.body());
    if (isPdf(bytes)) {
      return bytes;
    }
  }

  // Ultimo recurso: GET direto na URL padrao (sessao ja autenticada).
  const fallback = await page.request
    .get(`${SECURITY_ORIGIN}/iBusinessPortal/jsp/templates/Pdf/JasperPDF.jsp?AppName=SIT&TransId=T34693`, {
      timeout: timeoutMs,
    })
    .catch(() => undefined);
  if (fallback) {
    const bytes = new Uint8Array(await fallback.body());
    if (isPdf(bytes)) {
      return bytes;
    }
  }

  return undefined;
}

function matchesReportResponse(response: Response, wantPdf: boolean): boolean {
  if (response.status() < 200 || response.status() >= 400) {
    return false;
  }
  const url = response.url();
  const ct = (response.headers()["content-type"] ?? "").toLowerCase();
  if (wantPdf) {
    return (
      ct.includes("pdf") ||
      /JasperPDF|application\/pdf|\.pdf(\?|$)/i.test(url) ||
      (/octet-stream/i.test(ct) && /pdf|jasper|demonstrativo/i.test(url))
    );
  }
  return (
    ct.includes("excel") ||
    ct.includes("spreadsheet") ||
    ct.includes("ms-excel") ||
    /Downloader\.jsp|application\/octet-stream|\.xls/i.test(url + ct)
  );
}

async function readBytesFromPage(
  page: Page,
  tempDir: string,
  timeoutMs: number,
  wantPdf: boolean,
): Promise<Uint8Array | undefined> {
  if (wantPdf) {
    return readPdfFromJasperPopup(page, timeoutMs);
  }

  const download = await page.waitForEvent("download", { timeout: Math.min(timeoutMs, 8_000) }).catch(() => undefined);
  if (download) {
    return readDownload(download, tempDir);
  }

  const response = await page
    .waitForResponse((res) => matchesReportResponse(res, false), { timeout: Math.min(timeoutMs, 10_000) })
    .catch(() => undefined);
  if (response) {
    return new Uint8Array(await response.body());
  }

  return undefined;
}

async function readDownload(download: Download, tempDir: string): Promise<Uint8Array> {
  const tempPath = path.join(tempDir, `${Date.now()}-${download.suggestedFilename()}`);
  await download.saveAs(tempPath);
  const bytes = await fs.readFile(tempPath);
  await fs.rm(tempPath, { force: true }).catch(() => undefined);
  return bytes;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
