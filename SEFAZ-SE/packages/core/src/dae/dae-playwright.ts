import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import {
  loginSefazContabilista,
  openDiaModule,
} from "../shared/sefaz-playwright-login";
import { nomeMesPt } from "./referencia";
import type { Contribuinte, DaeReferencia, GerarDaeConfig } from "./types";

const LAUNCH_TIMEOUT_MS = 90_000;
const PORTAL_URL = "https://security.sefaz.se.gov.br/internet/portal.jsp";

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

export class GerarDaePlaywrightClient {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor(private readonly config: GerarDaeConfig) {}

  async start(): Promise<void> {
    this.browser = await this.launchBrowser(this.config.headless);
    this.context = await this.createContext(this.browser);
    this.context.setDefaultTimeout(this.config.timeoutMs);
    this.page = this.context.pages()[0] ?? (await this.context.newPage());
    if (!this.config.headless) {
      await this.page.bringToFront().catch(() => undefined);
    }

    await loginSefazContabilista(this.page, this.config);
    await openDiaModule(this.page, this.config.timeoutMs);
  }

  async gerarDaeParaContribuinte(c: Contribuinte, ref: DaeReferencia): Promise<string> {
    const page = this.requirePage();
    const context = this.requireContext();

    await this.garantirMenuDia();

    await page.getByRole("link", { name: "Gerar DAE" }).click({ timeout: this.config.timeoutMs });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);

    await page
      .locator("#cdPessoaContribuinte")
      .selectOption(c.cdPessoaContribuinte, { timeout: this.config.timeoutMs });
    await page.getByRole("button", { name: "Ok" }).click({ timeout: this.config.timeoutMs });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);

    await this.configurarReferenciaMesAno(page, ref);

    await this.assertSemMensagemSemDebitos(page, ref);

    const [popup] = await Promise.all([
      context.waitForEvent("page", { timeout: this.config.timeoutMs }),
      page
        .getByRole("button", { name: "Gerar DAE" })
        .click({ timeout: this.config.timeoutMs }),
    ]);

    try {
      await popup.waitForLoadState("domcontentloaded", { timeout: this.config.timeoutMs });
      await popup
        .waitForLoadState("networkidle", { timeout: this.config.timeoutMs })
        .catch(() => undefined);

      const fileName = this.montarNomeArquivo(c, ref);
      const outPath = path.join(this.config.outDir, fileName);
      await fs.promises.mkdir(this.config.outDir, { recursive: true });

      await this.salvarPdfDoPopup(popup, outPath);

      return outPath;
    } finally {
      await popup.close().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
  }

  private async garantirMenuDia(): Promise<void> {
    const page = this.requirePage();
    await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await openDiaModule(page, this.config.timeoutMs);
  }

  /**
   * Tela "Gerar DAE" da SEFAZ-SE: mês e ano em selects (#dtReferenciaMes com valores 01-12, #dtReferenciaAno).
   * Em layouts antigos, o mês pode vir só numa tabela — nesse caso usa-se clicarLinhaMes.
   */
  private async configurarReferenciaMesAno(page: Page, ref: DaeReferencia): Promise<void> {
    const ano = String(ref.ano);
    const mesValor = String(ref.mes).padStart(2, "0");
    const mesSelect = page.locator("#dtReferenciaMes");
    const anoSelect = page.locator("#dtReferenciaAno");

    const mesVisivel = await mesSelect
      .first()
      .isVisible({ timeout: Math.min(this.config.timeoutMs, 15_000) })
      .catch(() => false);

    if (mesVisivel) {
      await anoSelect.first().selectOption(ano, { timeout: this.config.timeoutMs });
      await mesSelect.first().selectOption(mesValor, { timeout: this.config.timeoutMs });
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page
        .waitForLoadState("networkidle", { timeout: Math.min(this.config.timeoutMs, 15_000) })
        .catch(() => undefined);
      console.log(`   referencia ${mesValor}/${ano} via #dtReferenciaMes / #dtReferenciaAno`);
      return;
    }

    await anoSelect.first().selectOption(ano, { timeout: this.config.timeoutMs });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await this.clicarLinhaMes(page, ref);
  }

  private async assertSemMensagemSemDebitos(page: Page, ref: DaeReferencia): Promise<void> {
    const mesPad = String(ref.mes).padStart(2, "0");
    const texto = await page.locator("body").innerText().catch(() => "");
    if (/n[aã]o\s+possui\s+d[eé]bitos\s+para\s+esta\s+refer[eê]ncia/i.test(texto)) {
      throw new Error(
        `SEFAZ: contribuinte sem debitos para a referencia ${mesPad}/${ref.ano}. ` +
          "Ajuste --ano/--mes ou confira o extrato DIA antes de gerar o DAE.",
      );
    }
  }

  private async clicarLinhaMes(page: Page, ref: DaeReferencia): Promise<void> {
    const mesPad = String(ref.mes).padStart(2, "0");
    const mesNoPad = String(ref.mes);
    const ano = String(ref.ano);
    const mesAnoPad = `${mesPad}/${ano}`;
    const mesAnoNoPad = `${mesNoPad}/${ano}`;
    const nomeMes = nomeMesPt(ref.mes);
    const nomeMesAno = `${nomeMes}/${ano}`;
    const reMesFlex = new RegExp(`(?:^|\\s)0?${mesNoPad}/${ano}(?:\\s|$)`);

    const candidatos: Array<{ desc: string; run: () => Promise<boolean> }> = [
      {
        desc: `cell exact "${mesAnoNoPad}" (formato SEFAZ M/AAAA sem zero)`,
        run: () => this.tryClick(page.getByRole("cell", { name: mesAnoNoPad, exact: true }).first()),
      },
      {
        desc: `cell exact "${mesAnoPad}" (formato MM/AAAA com zero)`,
        run: () => this.tryClick(page.getByRole("cell", { name: mesAnoPad, exact: true }).first()),
      },
      {
        desc: `cell regex "0?${mesNoPad}/${ano}"`,
        run: () =>
          this.tryClick(
            page.getByRole("cell", { name: new RegExp(`^\\s*0?${mesNoPad}/${ano}\\s*$`) }).first(),
          ),
      },
      {
        desc: `cell exact "${nomeMesAno}"`,
        run: () => this.tryClick(page.getByRole("cell", { name: nomeMesAno, exact: true }).first()),
      },
      {
        desc: `cell regex nome do mes`,
        run: () =>
          this.tryClick(
            page
              .getByRole("cell", { name: new RegExp(`${nomeMes}\\s*/?\\s*${ano}`, "i") })
              .first(),
          ),
      },
      {
        desc: `text exact "${mesAnoNoPad}"`,
        run: () => this.tryClick(page.getByText(mesAnoNoPad, { exact: true }).first()),
      },
      {
        desc: `text exact "${mesAnoPad}"`,
        run: () => this.tryClick(page.getByText(mesAnoPad, { exact: true }).first()),
      },
      {
        desc: `text exact "${nomeMesAno}"`,
        run: () => this.tryClick(page.getByText(nomeMesAno, { exact: true }).first()),
      },
      {
        desc: `link/button por nome do mes`,
        run: () =>
          this.tryClick(
            page
              .getByRole("link", { name: new RegExp(`(0?${mesNoPad}/${ano}|${nomeMes}/${ano})`, "i") })
              .first(),
          ),
      },
      {
        desc: `radio/checkbox em row contendo mes`,
        run: async () => {
          const row = page.locator("tr", { hasText: reMesFlex }).first();
          const input = row.locator('input[type="radio"], input[type="checkbox"]').first();
          return this.tryClick(input);
        },
      },
      {
        desc: `primeira celula clicavel em row contendo mes`,
        run: async () => {
          const row = page.locator("tr", { hasText: reMesFlex }).first();
          return this.tryClick(row.locator("td").first());
        },
      },
    ];

    for (const tentativa of candidatos) {
      if (await tentativa.run()) {
        console.log(`   linha do mes selecionada via: ${tentativa.desc}`);
        await page.waitForLoadState("domcontentloaded").catch(() => undefined);
        return;
      }
    }

    const dumpPath = await this.dumpDiagnostic(page, `linha-mes-${mesPad}-${ano}`);
    throw new Error(
      `Linha do mes ${mesAnoPad} (${nomeMes}/${ano}) nao encontrada na tabela de DAEs.` +
        (dumpPath ? ` Snapshot salvo em ${dumpPath} (HTML + screenshot).` : ""),
    );
  }

  private async tryClick(locator: ReturnType<Page["locator"]>): Promise<boolean> {
    try {
      const count = await locator.count();
      if (count === 0) {
        return false;
      }
      await locator.click({ timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  private async dumpDiagnostic(page: Page, label: string): Promise<string | undefined> {
    try {
      const dir = path.join(this.config.outDir, "_debug");
      await fs.promises.mkdir(dir, { recursive: true });
      const ts = Date.now();
      const base = `${label}-${ts}`;
      const screenshotPath = path.join(dir, `${base}.png`);
      const htmlPath = path.join(dir, `${base}.html`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      const html = await page.content().catch(() => undefined);
      if (html !== undefined) {
        await fs.promises.writeFile(htmlPath, html, "utf8");
      }
      return dir;
    } catch {
      return undefined;
    }
  }

  private montarNomeArquivo(c: Contribuinte, ref: DaeReferencia): string {
    const mes = String(ref.mes).padStart(2, "0");
    return `dae-${c.cdPessoaContribuinte}-${ref.ano}-${mes}-${Date.now()}.pdf`;
  }

  private async salvarPdfDoPopup(popup: Page, outPath: string): Promise<void> {
    if (this.config.headless) {
      await popup.emulateMedia({ media: "print" }).catch(() => undefined);
      await popup.pdf({ path: outPath, format: "A4", printBackground: true });
      return;
    }

    await this.gerarPdfViaContextoHeadless(popup, outPath);
  }

  private async gerarPdfViaContextoHeadless(popup: Page, outPath: string): Promise<void> {
    const context = this.requireContext();
    const url = popup.url();
    if (!url || url === "about:blank") {
      throw new Error("URL do popup invalida; nao foi possivel gerar PDF em modo headed.");
    }

    const storageState = await context.storageState();

    let headlessBrowser: Browser | undefined;
    try {
      headlessBrowser = await this.launchBrowser(true);
      const headlessContext = await headlessBrowser.newContext({
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        viewport: { width: 1280, height: 900 },
        storageState,
      });
      headlessContext.setDefaultTimeout(this.config.timeoutMs);
      const headlessPage = await headlessContext.newPage();
      await headlessPage.goto(url, { waitUntil: "domcontentloaded" });
      await headlessPage
        .waitForLoadState("networkidle", { timeout: this.config.timeoutMs })
        .catch(() => undefined);
      await headlessPage.emulateMedia({ media: "print" }).catch(() => undefined);
      await headlessPage.pdf({ path: outPath, format: "A4", printBackground: true });
    } finally {
      await headlessBrowser?.close().catch(() => undefined);
    }
  }

  private async launchBrowser(headless: boolean): Promise<Browser> {
    return chromium.launch({
      headless,
      channel: this.config.browserChannel,
      args: chromiumLaunchArgs(),
      timeout: LAUNCH_TIMEOUT_MS,
    });
  }

  private async createContext(browser: Browser): Promise<BrowserContext> {
    const existing = browser.contexts()[0];
    if (existing) {
      return existing;
    }

    return browser.newContext({
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
    });
  }

  private requirePage(): Page {
    if (!this.page) {
      throw new Error("Navegador Playwright nao iniciado.");
    }

    return this.page;
  }

  private requireContext(): BrowserContext {
    if (!this.context) {
      throw new Error("Contexto do navegador nao iniciado.");
    }

    return this.context;
  }
}
