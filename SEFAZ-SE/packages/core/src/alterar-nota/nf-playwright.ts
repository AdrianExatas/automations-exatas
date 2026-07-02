import process from "node:process";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { loginSefazContabilista, openDiaModule } from "../shared/sefaz-playwright-login";
import { matchesNotaFiscal } from "./normalize";
import type { NotaFiscalAlteracaoInput, NotaFiscalMatch, RunAlterarNotaFiscalConfig } from "./nf-types";

const LAUNCH_TIMEOUT_MS = 90_000;

function headedChromiumArgs(): string[] {
  const base = ["--window-position=80,80"];
  if (process.platform !== "win32") {
    return base;
  }

  return [
    ...base,
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows",
  ];
}

export class NotaFiscalPlaywrightClient {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor(private readonly config: RunAlterarNotaFiscalConfig) {}

  async start(): Promise<void> {
    this.browser = await this.launchBrowser();
    this.context = await this.browser.newContext({
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
    });
    this.context.setDefaultTimeout(this.config.timeoutMs);
    this.page = await this.context.newPage();
    if (!this.config.headless) {
      await this.page.bringToFront().catch(() => undefined);
    }
    await loginSefazContabilista(this.page, this.config);
  }

  private async launchBrowser(): Promise<Browser> {
    const headless = this.config.headless;
    if (headless) {
      return chromium.launch({ headless: true });
    }

    const channel = this.config.browserChannel;
    const args = headedChromiumArgs();
    const headedOpts = { headless: false as const, args, timeout: LAUNCH_TIMEOUT_MS };

    if (channel === "msedge") {
      return chromium.launch({ ...headedOpts, channel: "msedge" });
    }
    if (channel === "chrome") {
      return chromium.launch({ ...headedOpts, channel: "chrome" });
    }
    if (channel === "chromium") {
      return chromium.launch(headedOpts);
    }

    // Padrao headed (Windows): Edge instalado primeiro (Chromium empacotado pode travar em alguns terminais); senao Chromium do Playwright.
    if (process.platform === "win32") {
      try {
        return await chromium.launch({ ...headedOpts, channel: "msedge" });
      } catch {
        /* fallback abaixo */
      }
    }

    return chromium.launch(headedOpts);
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
  }

  async process(input: NotaFiscalAlteracaoInput): Promise<string | undefined> {
    if (input.acao === "ignorar") {
      return "Linha verde: sem alteracao no portal.";
    }

    const page = this.requirePage();
    await this.openAlterarNotaFiscal(page);
    await this.pause();
    await page.locator("#cdPessoaContribuinte").selectOption(input.inscricaoMunicipal);
    await this.pause();
    await clickOk(page);
    await this.pause();
    await clearOptionalFilters(page);
    await this.pause();
    await page.locator("#ETQ_nrEtiqueta").fill(input.etiqueta);
    await this.pause();
    await clickOk(page);
    await this.pause();
    await clickMatchingNota(page, {
      etiqueta: input.etiqueta,
      icms: input.icmsAtual,
      recolhimento: input.recolhimentoAtual,
    });
    await this.pause();
    await fillIcmsNovo(page, input.icmsNovo);
    await this.pause();
    await selectRecolhimentoNovo(page, input.recolhimentoNovo);
    await this.pause();
    if (input.acao === "adiar") {
      await checkAdiarReferencia(page);
      await this.pause();
    }

    if (this.config.dryRun) {
      return "Dry-run: valores preenchidos, mas o Ok final nao foi clicado.";
    }

    await clickFinalOkWithConfirmation(page);
    return undefined;
  }

  private async openAlterarNotaFiscal(page: Page): Promise<void> {
    if (await page.locator("#cdPessoaContribuinte").isVisible({ timeout: 1_500 }).catch(() => false)) {
      return;
    }

    await openDiaModule(page, this.config.timeoutMs);
    await page.getByRole("link", { name: /Alterar\s+Nota\s+Fiscal\s*-\s*DIA\s+Atual/i }).click({ timeout: this.config.timeoutMs });
    await page.locator("#cdPessoaContribuinte").waitFor({ state: "visible", timeout: this.config.timeoutMs });
  }

  private async pause(): Promise<void> {
    if (this.config.stepDelayMs > 0) {
      await this.requirePage().waitForTimeout(this.config.stepDelayMs);
    }
  }

  private requirePage(): Page {
    if (!this.page) {
      throw new Error("Navegador Playwright nao iniciado.");
    }

    return this.page;
  }
}

async function clearOptionalFilters(page: Page): Promise<void> {
  for (const selector of ["#exibicaoConsulta", "#AnoReferencia", "#MesReferencia"]) {
    const locator = page.locator(selector);
    if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await locator.selectOption("").catch(() => undefined);
    }
  }
}

async function clickMatchingNota(page: Page, expected: NotaFiscalMatch): Promise<void> {
  const rows = page.locator("table tr.trTableImpar, table tr.trTablePar");
  const count = await rows.count();
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const cells = row.locator("td");
    if (await cells.count() < 10) {
      continue;
    }

    const actual = {
      etiqueta: await textOf(cells.nth(0)),
      icms: await textOf(cells.nth(2)),
      recolhimento: await textOf(cells.nth(9)),
    };
    if (matchesNotaFiscal(actual, expected)) {
      await row.locator("a").first().click();
      return;
    }
  }

  throw new Error("Nenhuma nota encontrada com etiqueta, ICMS atual e recolhimento atual informados.");
}

async function fillIcmsNovo(page: Page, icmsNovo: string): Promise<void> {
  if (!icmsNovo.trim()) {
    throw new Error("ICMS novo nao informado.");
  }

  const locator = page.locator("#NTF_vlICMSCalculado").or(page.locator(".inputNumber")).first();
  await locator.waitFor({ state: "visible" });
  await locator.fill(icmsNovo.trim().replace(".", ","));
}

async function selectRecolhimentoNovo(page: Page, recolhimentoNovo: string): Promise<void> {
  if (!recolhimentoNovo.trim()) {
    throw new Error("Recolhimento novo nao informado.");
  }

  const select = page.locator("#FRC_cdFormaRecolhimento");
  await select.waitFor({ state: "visible" });
  await select.selectOption({ label: recolhimentoNovo.trim() });
}

async function checkAdiarReferencia(page: Page): Promise<void> {
  const checkbox = page.locator("#ckAdiarReferencia");
  await checkbox.waitFor({ state: "visible" });
  await checkbox.check();
}

async function clickOk(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Ok$/i }).click();
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
}

async function clickFinalOkWithConfirmation(page: Page): Promise<void> {
  await clickOk(page);
  await page.getByRole("button", { name: "Ok" }).click();
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
}

async function textOf(locator: Locator): Promise<string> {
  return (await locator.textContent())?.replace(/\s+/g, " ").trim() ?? "";
}
