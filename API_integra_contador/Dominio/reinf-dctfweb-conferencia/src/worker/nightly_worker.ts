/**
 * Worker Noturno / Varredura Fiscal Automatizada em Segundo Plano
 * Executa checagem proativa de Caixa Postal, Situação Fiscal e Vigência de Procurações
 */
import type { DominioCompany } from "../types.ts";
import type { CaixaPostalService } from "../serpro/caixapostal_service.ts";
import type { SitfisService } from "../serpro/sitfis_service.ts";
import type { ProcuracaoService } from "../serpro/procuracao_service.ts";
import type { SqliteStorage } from "../storage/sqlite.ts";

export interface WorkerCompanyProvider {
  listCompanies(): Promise<DominioCompany[]>;
}

export interface WorkerProgress {
  isRunning: boolean;
  totalEmpresas: number;
  processadas: number;
  currentEmpresa?: string;
  novasMensagensEncontradas: number;
  pendenciasEncontradas: number;
  procuracoesVencendo: number;
  erros: Array<{ cnpj: string; razaoSocial?: string; erro: string }>;
  inicioIso?: string;
  fimIso?: string;
  duracaoMs?: number;
}

export class NightlyWorker {
  private isRunning = false;
  private currentProgress: WorkerProgress = {
    isRunning: false,
    totalEmpresas: 0,
    processadas: 0,
    novasMensagensEncontradas: 0,
    pendenciasEncontradas: 0,
    procuracoesVencendo: 0,
    erros: [],
  };

  constructor(
    private readonly companyProvider: WorkerCompanyProvider,
    private readonly caixaPostalService: CaixaPostalService,
    private readonly sitfisService: SitfisService,
    private readonly procuracaoService: ProcuracaoService,
    private readonly storage: SqliteStorage,
  ) {}

  public getStatus(): WorkerProgress {
    return { ...this.currentProgress };
  }

  /**
   * Executa a rotina de varredura das empresas ativas
   * @param limit Limite opcional de empresas para execução parcial/amostral
   * @param delayMs Intervalo entre requisições para respeitar rate limits (padrão 250ms)
   */
  public async run(limit?: number, delayMs: number = 250): Promise<WorkerProgress> {
    if (this.isRunning) {
      throw new Error("Worker já está em execução. Aguarde a conclusão da rotina anterior.");
    }

    this.isRunning = true;
    const startTime = Date.now();
    const inicioIso = new Date().toISOString();

    this.currentProgress = {
      isRunning: true,
      totalEmpresas: 0,
      processadas: 0,
      novasMensagensEncontradas: 0,
      pendenciasEncontradas: 0,
      procuracoesVencendo: 0,
      erros: [],
      inicioIso,
    };

    try {
      // 1. Obter empresas ativas
      const allEmpresas = await this.companyProvider.listCompanies();
      let empresas = allEmpresas.filter((e) => e.ativo !== false);
      if (limit && limit > 0) {
        empresas = empresas.slice(0, limit);
      }

      this.currentProgress.totalEmpresas = empresas.length;

      for (const emp of empresas) {
        this.currentProgress.currentEmpresa = `${emp.razaoSocial} (${emp.cnpj})`;

        try {
          const cleanCnpj = emp.cnpj.replace(/\D/g, "");

          // A. Checar Caixa Postal (INNOVAMSG63)
          try {
            const indMsg = await this.caixaPostalService.obterIndicadorNovasMensagens(cleanCnpj);
            if (indMsg.temNovas) {
              this.currentProgress.novasMensagensEncontradas++;
              this.storage.saveCaixaPostalResult(cleanCnpj, {
                indicadorNovas: 1,
                qtdMensagens: 1,
                mensagens: [],
              });
            }
          } catch (e: any) {
            // Log amigável sem interromper a esteira
          }

          // B. Checar Situação de Procuração (PROCURACOES.OBTERPROCURACAO41)
          try {
            const procRes = await this.procuracaoService.obterProcuracao(cleanCnpj);
            this.storage.saveProcuracao(procRes);

            if (procRes.statusGeral === "EXPIRADA" || procRes.statusGeral === "CRITICA" || procRes.statusGeral === "ALERTA") {
              this.currentProgress.procuracoesVencendo++;
            }
          } catch (e: any) {
            // Log amigável
          }

          // C. Checar Situação Fiscal (SITFIS)
          try {
            let sitfisCached = this.storage.getSitfisResult(cleanCnpj);
            // Se nunca consultado ou mais de 7 dias
            if (!sitfisCached || Date.now() - new Date(sitfisCached.data_consulta).getTime() > 7 * 86400000) {
              const proto = await this.sitfisService.solicitarProtocolo(cleanCnpj);
              if (proto.protocoloRelatorio) {
                const waitTime = Math.min(Math.max((proto.tempoEspera || 2) * 1000, 1000), 3000);
                await new Promise((r) => setTimeout(r, waitTime));
                const rel = await this.sitfisService.obterRelatorio(cleanCnpj, proto.protocoloRelatorio);
                const situacao = rel.situacaoGeral || (rel.status === 200 ? "REGULAR" : "PROCESSANDO");
                this.storage.saveSitfisResult(cleanCnpj, {
                  protocolo: proto.protocoloRelatorio,
                  situacao,
                  pdfBase64: rel.pdfBase64 || "",
                  mensagens: rel.mensagens,
                });
                sitfisCached = {
                  cnpj: cleanCnpj,
                  data_consulta: new Date().toISOString(),
                  protocolo: proto.protocoloRelatorio,
                  situacao,
                  pdf_base64: rel.pdfBase64 || null,
                  mensagens: rel.mensagens,
                };
              }
            }

            if (
              sitfisCached &&
              (sitfisCached.situacao === "PENDENTE" ||
                sitfisCached.situacao === "COM_PENDENCIAS" ||
                sitfisCached.situacao === "IRREGULAR")
            ) {
              this.currentProgress.pendenciasEncontradas++;
            }
          } catch (e: any) {
            // Log amigável
          }

        } catch (err: any) {
          this.currentProgress.erros.push({
            cnpj: emp.cnpj,
            razaoSocial: emp.razaoSocial,
            erro: err.message || String(err),
          });
        }

        this.currentProgress.processadas++;

        // Delay anti-throttling
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      const fimIso = new Date().toISOString();
      const duracaoMs = Date.now() - startTime;

      this.currentProgress.isRunning = false;
      this.currentProgress.fimIso = fimIso;
      this.currentProgress.duracaoMs = duracaoMs;

      // Salvar no histórico de execuções
      this.storage.saveWorkerHistorico({
        status: this.currentProgress.erros.length > 0 ? "CONCLUIDO_COM_AVISOS" : "SUCESSO",
        total_empresas: this.currentProgress.totalEmpresas,
        empresas_processadas: this.currentProgress.processadas,
        novas_mensagens_encontradas: this.currentProgress.novasMensagensEncontradas,
        pendencias_encontradas: this.currentProgress.pendenciasEncontradas,
        procuracoes_vencendo: this.currentProgress.procuracoesVencendo,
        duracao_ms: duracaoMs,
        detalhes: {
          inicioIso,
          fimIso,
          erros: this.currentProgress.erros,
        },
      });

      return { ...this.currentProgress };
    } finally {
      this.isRunning = false;
    }
  }
}
