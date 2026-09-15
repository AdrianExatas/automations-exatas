import type { Page } from "playwright";
import type { Config } from "../config";
import { EmpresaNotFoundError, NoNotasError } from "../exceptions";
import { EmpresaSelectionPage } from "../pages/empresa-selection-page";
import { ServicoTomadoDetailPage } from "../pages/servico-tomado-detail-page";
import { ServicosTomadosPage } from "../pages/servicos-tomados-page";
import type {
  ClassificacaoReinf,
  CompetenciaTotais,
  ConferenciaEmpresaStats,
  DownloadLogger,
  NotaFiscalRow,
  ServicoTomadoDetalhe,
} from "../types";

function hasValorRetencao(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.replace(/[R$\s.]/g, "").replace(",", ".").trim();
  if (!normalized || normalized === "-" || normalized === "0" || normalized === "0.00") {
    return false;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n > 0 : /[1-9]/.test(normalized);
}

function aguardandoInteracao(nota: NotaFiscalRow): boolean {
  const situacao =
    `${nota.situacaoRetencoes || ""} ${nota.detalhe?.situacaoCalculoRetencao || ""}`.toLowerCase();
  return (
    situacao.includes("aguardando interação") ||
    situacao.includes("aguardando interacao") ||
    (nota.detalhe?.perguntasPendentes?.length ?? 0) > 0
  );
}

function candidatoR2010(detalhe: ServicoTomadoDetalhe | undefined): boolean {
  if (!detalhe || !hasValorRetencao(detalhe.retencoes.inss)) return false;
  const text =
    `${detalhe.validacoesTexto} ${detalhe.servicoTexto} ${detalhe.totaisTexto}`.toLowerCase();
  // Valor INSS ja calculado; texto de cessao MO reforca, mas nao e obrigatorio.
  return (
    /cess[aã]o|m[aã]o de obra|mao de obra|cessao de mo/i.test(text) ||
    hasValorRetencao(detalhe.retencoes.inss)
  );
}

export function classificarNota(nota: NotaFiscalRow): ClassificacaoReinf {
  if (nota.cancelada) return "sem_fato_reinf";
  if (aguardandoInteracao(nota)) return "bloqueada_interacao";

  const detalhe = nota.detalhe;
  if (candidatoR2010(detalhe)) return "candidato_r2010";
  if (
    detalhe &&
    (hasValorRetencao(detalhe.retencoes.irrf) || hasValorRetencao(detalhe.retencoes.csrf))
  ) {
    return "candidato_r4020";
  }
  return "revisar_manual";
}

export function computeEmpresaStats(notas: NotaFiscalRow[]): ConferenciaEmpresaStats {
  const naoConferidos = notas.filter((n) => n.statusConferencia === "nao_conferido");
  const canceladas = naoConferidos.filter((n) => n.cancelada).length;
  const ativas = naoConferidos.filter((n) => !n.cancelada);

  return {
    totalNotas: notas.length,
    conferidos: notas.filter((n) => n.statusConferencia === "conferido").length,
    naoConferidos: naoConferidos.length,
    canceladas,
    ativasAbertas: ativas.filter((n) => n.detalhe).length,
    bloqueadasInteracao: notas.filter((n) => n.classificacao === "bloqueada_interacao").length,
    candidatosR2010: notas.filter((n) => n.classificacao === "candidato_r2010").length,
    candidatosR4020: notas.filter((n) => n.classificacao === "candidato_r4020").length,
    semFatoReinf: notas.filter((n) => n.classificacao === "sem_fato_reinf").length,
    revisarManual: notas.filter((n) => n.classificacao === "revisar_manual").length,
  };
}

export class ConferenciaNotasFlow {
  private readonly empresaPage: EmpresaSelectionPage;
  private readonly servicosPage: ServicosTomadosPage;
  private readonly detailPage: ServicoTomadoDetailPage;

  constructor(
    private readonly page: Page,
    private readonly config: Config,
  ) {
    this.empresaPage = new EmpresaSelectionPage(page);
    this.servicosPage = new ServicosTomadosPage(page);
    this.detailPage = new ServicoTomadoDetailPage(page);
  }

  async selectEmpresa(cnpj: string): Promise<void> {
    await this.empresaPage.clickSelecionarEmpresa();
    await this.empresaPage.searchCnpj(cnpj);

    try {
      await this.empresaPage.selectEmpresaByCnpj(cnpj);
    } catch (error) {
      const errMsg = String(error).toLowerCase();
      if (
        errMsg.includes("não encontrado") ||
        errMsg.includes("nao encontrado") ||
        errMsg.includes("not found")
      ) {
        throw new EmpresaNotFoundError("Empresa nao cadastrada no UNECONT", cnpj);
      }
      throw error;
    }
  }

  async navigateToServicosTomados(): Promise<void> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.page.goto(this.config.servicosTomadosUrl, {
          waitUntil: "domcontentloaded",
          timeout: this.config.defaultTimeout * 1000,
        });
        break;
      } catch (error) {
        const msg = (error as Error).message;
        if (msg.includes("ERR_ABORTED") && attempt < 2) continue;
        throw error;
      }
    }

    await this.empresaPage.closeNovidadeModal();
    await this.servicosPage.waitForNotasTable(15_000);
  }

  async listarNotas(cnpj: string, mesesAnteriores = 0): Promise<NotaFiscalRow[]> {
    if (mesesAnteriores > 0) {
      await this.servicosPage.selectMesesAnteriores(mesesAnteriores);
    }

    const notas = await this.servicosPage.listNotas();
    if (notas.length === 0) {
      throw new NoNotasError(
        "Nao foram encontradas Nota Fiscais para o periodo informado.",
        cnpj,
      );
    }
    return notas;
  }

  async readTotais(): Promise<CompetenciaTotais> {
    return this.servicosPage.readTotaisCompetencia();
  }

  /**
   * Abre detalhe das Nao Conferidas ativas (e opcionalmente 1 cancelada),
   * sem responder Sim/Nao. Classifica cada nota.
   */
  async enriquecerNaoConferidos(
    notas: NotaFiscalRow[],
    options: {
      somenteNaoConferidos?: boolean;
      amostraCanceladas?: boolean;
      logger?: DownloadLogger;
    } = {},
  ): Promise<NotaFiscalRow[]> {
    const somenteNaoConferidos = options.somenteNaoConferidos !== false;
    const amostraCanceladas = options.amostraCanceladas === true;
    const logger = options.logger;

    const alvos = notas.filter((n) => {
      if (somenteNaoConferidos && n.statusConferencia !== "nao_conferido") return false;
      return true;
    });

    const ativas = alvos.filter(
      (n) => n.statusConferencia === "nao_conferido" && !n.cancelada && n.unecontId,
    );
    const canceladas = alvos.filter(
      (n) => n.statusConferencia === "nao_conferido" && n.cancelada && n.unecontId,
    );

    logger?.info?.(
      `Triagem: ${ativas.length} Nao Conferida(s) ativa(s) para abrir; ${canceladas.length} cancelada(s).`,
    );

    for (const nota of ativas) {
      try {
        logger?.info?.(
          `Abrindo detalhe NF ${nota.numeroNfe} (id ${nota.unecontId}) — sem responder interacoes`,
        );
        await this.detailPage.open(nota.unecontId!);
        nota.detalhe = await this.detailPage.extract();
        await this.detailPage.close();
      } catch (error) {
        logger?.warn?.(
          `Falha ao abrir detalhe NF ${nota.numeroNfe}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await this.detailPage.close().catch(() => {});
      }
    }

    if (amostraCanceladas && canceladas.length > 0) {
      const amostra = canceladas[0];
      try {
        logger?.info?.(
          `Amostra cancelada NF ${amostra.numeroNfe} (id ${amostra.unecontId})`,
        );
        await this.detailPage.open(amostra.unecontId!);
        amostra.detalhe = await this.detailPage.extract();
        await this.detailPage.close();
      } catch (error) {
        logger?.warn?.(
          `Falha amostra cancelada NF ${amostra.numeroNfe}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await this.detailPage.close().catch(() => {});
      }
    }

    for (const nota of notas) {
      if (nota.statusConferencia === "nao_conferido") {
        nota.classificacao = classificarNota(nota);
      }
    }

    return notas;
  }
}
