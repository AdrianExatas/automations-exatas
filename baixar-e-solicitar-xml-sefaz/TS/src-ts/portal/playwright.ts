import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Frame, type Page } from "playwright";
import { PATHS, SEFAZ_CERT_PFX_PASSWORD, SEFAZ_CERT_PFX_PATH, SEFAZ_PLAYWRIGHT_HEADLESS } from "../core/config.js";
import { organizeDownloadedZip, verificarZipValido } from "../download/files.js";
import { downloadState } from "../download/state.js";
import { parseDownloadListing, parseEmpresasDoFormulario, parseForm } from "../sefaz-http/parser.js";
import { SefazHttpError, SefazPortalBusinessError, SefazPortalIncompatibleError } from "../sefaz-http/client.js";
import type { DownloadInfo, DownloadListingPage, SolicitacaoResultado } from "../types.js";

const PUBLIC_LOGIN_URL = "https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx";
const VINCULOS_URL = "https://portais-fazendario.apps.sefaz.se.gov.br/private/portal-fazendario/vinculos";
const CERTIFICATE_ORIGINS = [
  "https://portal.sefaz.se.gov.br",
  "https://portais-fazendario.apps.sefaz.se.gov.br",
  "https://security.sefaz.se.gov.br",
];

export class SefazPlaywrightPortal {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private serviceFrame?: Frame;

  async login(headless = SEFAZ_PLAYWRIGHT_HEADLESS): Promise<{ cookies: Awaited<ReturnType<BrowserContext["cookies"]>>; servicoXmlUrl: string }> {
    if (!SEFAZ_CERT_PFX_PATH || !SEFAZ_CERT_PFX_PASSWORD) {
      throw new SefazHttpError("Certificado PFX da SEFAZ nao configurado para o Playwright");
    }
    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({
      clientCertificates: CERTIFICATE_ORIGINS.map((origin) => ({
        origin,
        pfxPath: SEFAZ_CERT_PFX_PATH,
        passphrase: SEFAZ_CERT_PFX_PASSWORD,
      })),
    });
    this.page = await this.context.newPage();
    await this.page.goto(PUBLIC_LOGIN_URL, { waitUntil: "domcontentloaded" });
    const popupPromise = this.page.waitForEvent("popup");
    await this.page.getByRole("link", { name: /Acessar Portal Fazend[aá]rio/i }).click();
    const portalPage = await popupPromise;
    this.page = portalPage;
    await portalPage.getByRole("link", { name: /Certificado Digital/i }).click();
    await portalPage.goto(VINCULOS_URL, { waitUntil: "domcontentloaded" });
    await this.selecionarPrimeiroVinculoContador();
    await this.navegarAoServicoXml();
    const servicoXmlUrl = this.serviceFrame?.url();
    if (!servicoXmlUrl || servicoXmlUrl === "about:blank") {
      throw new SefazPortalIncompatibleError("O iframe do servico XML nao informou uma URL utilizavel");
    }
    return { cookies: await this.context.cookies(), servicoXmlUrl };
  }

  async listarDownloads(pageNumber: number, readyOnly: boolean): Promise<DownloadListingPage> {
    const frame = await this.obterServico();
    const current = parseDownloadListing(frame.url(), frame.url(), await frame.content(), readyOnly);
    if (pageNumber > 1 && current.currentPage !== pageNumber) {
      const href = current.pageLinks[pageNumber];
      if (!href) throw new SefazPortalIncompatibleError(`Pagina ${pageNumber} nao disponivel no portal`);
      await frame.goto(href, { waitUntil: "domcontentloaded" });
    }
    return parseDownloadListing(frame.url(), frame.url(), await frame.content(), readyOnly);
  }

  async listarEmpresas(): Promise<Array<{ inscricao: string; nome: string }>> {
    const frame = await this.abrirFormularioNovaSolicitacao();
    return parseEmpresasDoFormulario(parseForm(frame.url(), frame.url(), await frame.content()));
  }

  async preflightSolicitacao(inscricao: string): Promise<boolean> {
    const frame = await this.abrirFormularioNovaSolicitacao();
    await frame.locator("#cdPessoaContribuinte").selectOption(inscricao);
    await frame.locator("#okButton").click();
    try {
      await frame.locator("#tipoArquivo").waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      throw new SefazPortalIncompatibleError("O portal nao retornou o formulario de tipo de arquivo no Playwright");
    }
    return true;
  }

  async solicitarXml(params: Record<string, string>): Promise<SolicitacaoResultado> {
    const frame = await this.abrirFormularioNovaSolicitacao();
    try {
      await frame.locator("#cdPessoaContribuinte").selectOption(params.inscricao_municipal ?? "");
      await frame.locator("#okButton").click();
      await frame.locator("#tipoArquivo").waitFor({ state: "visible", timeout: 15_000 });
      await frame.locator("#tipoArquivo").selectOption(this.tipoArquivoValue(params.tipo_arquivo ?? ""));
      await frame.locator("#okButton").click();
      const tipo = (params.tipo_arquivo ?? "").toUpperCase();
      if (tipo === "CTE") {
        await frame.locator(`#${this.cteCheckboxId(params.pesquisar_por ?? "")}`).check();
      } else {
        await frame.locator("#tipoPesquisa").selectOption({ label: params.pesquisar_por ?? "" });
      }
      await frame.locator("#dtInicio").fill(params.data_inicial ?? "");
      await frame.locator("#dtFinal").fill(params.data_final ?? "");
      await frame.locator("#okButton").click({ noWaitAfter: true });
      await this.aguardarRespostaSolicitacao(frame);
      const text = (await frame.locator("body").innerText()).replace(/\s+/g, " ").trim();
      const error = await frame.locator(".fontMessageError").first().textContent().catch(() => null);
      if (error?.trim()) throw new SefazPortalBusinessError(error.trim());
      return { sucesso: true, mensagem: text ? "Solicitacao concluida com sucesso" : "Solicitacao enviada" };
    } catch (error) {
      if (error instanceof SefazPortalBusinessError) throw error;
      throw new SefazPortalIncompatibleError(`Falha ao solicitar XML pelo novo portal: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async baixarArquivo(info: DownloadInfo): Promise<string> {
    const frame = await this.obterServico();
    const downloadLink = frame.locator(`a[href*="nmArquivo=${encodeURIComponent(info.nmArquivo)}"]`).first();
    try {
      const [download] = await Promise.all([this.page!.waitForEvent("download"), downloadLink.click()]);
      const tempPath = join(PATHS.downloadsDir, `${info.nmArquivo}.zip`);
      await download.saveAs(tempPath);
      if (!verificarZipValido(tempPath)) {
        throw new SefazHttpError(`ZIP baixado esta corrompido: ${info.nmArquivo}`);
      }
      return organizeDownloadedZip(tempPath, info, downloadState.extrairZips);
    } catch (error) {
      if (error instanceof SefazHttpError) throw error;
      throw new SefazPortalIncompatibleError(`Falha ao baixar ${info.nmArquivo} pelo navegador: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = undefined;
    this.browser = undefined;
    this.page = undefined;
    this.serviceFrame = undefined;
  }

  private async abrirFormularioNovaSolicitacao(): Promise<Frame> {
    const frame = await this.obterServico();
    if (await frame.locator("#cdPessoaContribuinte").count()) {
      return frame;
    }
    const novo = frame.locator("a").filter({ hasText: /novo|nova solicita[cç][aã]o/i }).first();
    if (await novo.count()) {
      await novo.click();
    }
    try {
      await frame.locator("#cdPessoaContribuinte").waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      throw new SefazPortalIncompatibleError("Nao foi possivel abrir o formulario de nova solicitacao no Playwright");
    }
    return frame;
  }

  private async aguardarRespostaSolicitacao(frame: Frame): Promise<void> {
    const timeout = 30_000;
    try {
      await Promise.race([
        frame.locator(".fontMessageError").first().waitFor({ state: "visible", timeout }),
        frame.locator("#dtInicio").waitFor({ state: "hidden", timeout }),
      ]);
    } catch {
      throw new SefazPortalIncompatibleError("Timeout aguardando resposta da solicitacao XML no portal");
    }
  }

  private async selecionarPrimeiroVinculoContador(): Promise<void> {
    const page = this.requirePage();
    const card = page.locator("p-scrollpanel p-card, sefaz-card-vinculo").filter({ hasText: /Contador/i }).first();
    await card.getByRole("button").first().click();
    const combo = page.getByRole("combobox", { name: /Selecione o v[ií]nculo/i });
    await combo.click();
    const option = page.getByRole("option").filter({ hasText: /\S/ }).first();
    await option.click();
    await page.getByRole("button", { name: /^Ok$/i }).click();
  }

  private async navegarAoServicoXml(): Promise<void> {
    const page = this.requirePage();
    await page.getByText("Informações de Trânsito", { exact: true }).click();
    await page.getByText("NFE/DOCUMENTOS ELETRONICOS", { exact: true }).click();
    await page.getByText("Solicitar Arquivos XML", { exact: true }).click();
    const handle = await page.locator("#servico").elementHandle();
    this.serviceFrame = await handle?.contentFrame() ?? undefined;
    if (!this.serviceFrame) throw new SefazPortalIncompatibleError("Iframe #servico nao encontrado no Portal Fazendario");
    await this.serviceFrame.locator("body").waitFor({ state: "attached" });
  }

  private async obterServico(): Promise<Frame> {
    if (!this.serviceFrame) await this.navegarAoServicoXml();
    if (!this.serviceFrame) throw new SefazPortalIncompatibleError("Servico XML indisponivel");
    return this.serviceFrame;
  }

  private requirePage(): Page {
    if (!this.page) throw new SefazPortalIncompatibleError("Navegador do Portal Fazendario nao foi autenticado");
    return this.page;
  }

  private tipoArquivoValue(tipo: string): string {
    const value = { NFE: "0", CTE: "1", NFC: "2" }[tipo.trim().toUpperCase()];
    if (!value) throw new SefazPortalBusinessError(`Tipo de arquivo desconhecido: ${tipo}`);
    return value;
  }

  private cteCheckboxId(value: string): string {
    const ids: Record<string, string> = { Remetente: "Remetente", Expedidor: "Expedidor", Recebedor: "Recebedor", Destinatário: "Destinatario", Destinatario: "Destinatario", Emitente: "Emitente", Outros: "Outros" };
    const id = ids[value];
    if (!id) throw new SefazPortalBusinessError(`Tipo de pesquisa CTE desconhecido: ${value}`);
    return id;
  }
}
