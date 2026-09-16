import path from "node:path";

import { closeBrowserSession, launchBrowserSession, type BrowserSession } from "./browser.js";
import { loadConfig } from "./config.js";
import { fetchActiveDominioCompanies, normalizeDocument, type DominioQueryResult } from "./dominio.js";
import { authenticateFap } from "./fap-auth.js";
import { FapClient, FapRequestError } from "./fap-client.js";
import { SafeLogger, sanitizeText } from "./logger.js";
import { writeReports, type WrittenReports } from "./report.js";
import type {
  AppConfig,
  DominioCompany,
  FailureRecord,
  FapEmpresaSummary,
  FapEstabelecimentoResult,
  RunReport,
  TargetCompany,
} from "./types.js";
import {
  digitsOnly,
  extractCnpjRaiz,
  formatCnpj,
  formatRunTimestamp,
  isValidCnpj,
  stringValue,
} from "./utils.js";

const COLLECTOR_VERSION = "1.0.0";

export interface RunAutomationOptions {
  maxCompanies?: number;
  specificCnpj?: string;
  anoVigencia?: number;
}

export interface RunOutcome {
  exitCode: 0 | 1 | 2;
  runDir: string;
  report: RunReport;
  files: WrittenReports;
}

export async function runAutomation(options: RunAutomationOptions = {}): Promise<RunOutcome> {
  const startedAt = new Date();
  const config = await loadConfig();
  const runDir = path.join(config.outputDir, formatRunTimestamp(startedAt));
  const logger = new SafeLogger(runDir, [config.certificatePassword]);
  await logger.initialize();

  await logger.log("info", "========================================================");
  await logger.log("info", `Iniciando Coletor FAP Dataprev v${COLLECTOR_VERSION}`);
  await logger.log("info", `Modo do navegador: ${config.browserMode.toUpperCase()}`);
  await logger.log("info", "========================================================");

  const empresasSummary: FapEmpresaSummary[] = [];
  const estabelecimentosResults: FapEstabelecimentoResult[] = [];
  const failures: FailureRecord[] = [];
  let session: Partial<BrowserSession> = {};
  let fatal = false;
  let anoVigencia = options.anoVigencia || config.fapAnoVigencia;
  let vigenciaDetalhe: import("./types.js").FapVigenciaDetalhe | null = null;
  let consultaCompetencia = "-";

  let dominioResult: DominioQueryResult | null = null;
  if (config.filterDominioActive) {
    try {
      await logger.log("info", "Consultando empresas ativas no banco de dados Dominio via ODBC...");
      dominioResult = await fetchActiveDominioCompanies(config);
      await logger.log(
        "info",
        `Dominio: ${dominioResult.companies.length} empresa(s) ativa(s) carregada(s) (${dominioResult.activeCnpjs.size} CNPJs unicos).`,
      );
    } catch (error) {
      await logger.log(
        "warn",
        `Aviso: Falha ao consultar o banco Dominio (${sanitizeText(error)}). Prosseguindo com todas as procuracoes.`,
      );
    }
  }

  try {
    try {
      session = await launchBrowserSession(config);
    } catch (error) {
      fatal = true;
      failures.push({
        cnpj: config.procuratorCnpj,
        corporateName: "PROCURADOR",
        stage: "auth",
        category: "network",
        httpStatus: null,
        message: `Falha ao iniciar navegador: ${sanitizeText(error)}`,
        retryable: true,
      });
      await logger.log("error", error);
    }

    if (!fatal && session.page) {
      try {
        await authenticateFap(session.page, config.captchaTimeoutMs, logger);
      } catch (error) {
        fatal = true;
        failures.push({
          cnpj: config.procuratorCnpj,
          corporateName: "PROCURADOR",
          stage: "auth",
          category: "authentication",
          httpStatus: null,
          message: `Falha de autenticacao no FAP Dataprev / Gov.br: ${sanitizeText(error)}`,
          retryable: false,
        });
        await logger.log("error", error);
      }
    }

    if (!fatal && session.page) {
      const fapClient = new FapClient(session.page, config.requestDelayMs, logger);

      // Determina ano de vigencia
      if (!anoVigencia) {
        const anosDisponiveis = await fapClient.getAnosVigencia();
        if (anosDisponiveis.length > 0) {
          anoVigencia = anosDisponiveis[0];
          await logger.log("info", `Vigencias disponiveis: [${anosDisponiveis.join(", ")}]. Selecionada: ${anoVigencia}`);
        } else {
          anoVigencia = new Date().getFullYear();
          await logger.log("warn", `Nao foi possivel obter anos da API. Usando ano corrente: ${anoVigencia}`);
        }
      } else {
        await logger.log("info", `Ano de vigencia configurado: ${anoVigencia}`);
      }

      // Detalhes da vigencia (data de inicio de consulta da competencia, contestacao, etc.)
      vigenciaDetalhe = await fapClient.getVigenciaDetalhe(anoVigencia);
      consultaCompetencia = vigenciaDetalhe?.consultaCompetencia || "-";
      await logger.log(
        "info",
        `Vigencia ${anoVigencia} - Inicio da Consulta (consultaCompetencia): ${consultaCompetencia}`,
      );

      // Descobre empresas com procuracao
      await logger.log("info", "Carregando lista de empresas com procuracao e vinculacoes...");
      const targetMap = new Map<string, TargetCompany>();

      // Se foi solicitado um CNPJ especifico de teste
      if (options.specificCnpj) {
        const clean = digitsOnly(options.specificCnpj);
        const raiz = extractCnpjRaiz(clean);
        targetMap.set(raiz, {
          cnpj: clean.length === 14 ? clean : `${clean}000100`.slice(0, 14),
          cnpjRaiz: raiz,
          corporateName: `CNPJ ${formatCnpj(clean)}`,
          source: "manual",
        });
        await logger.log("info", `Execucao restrita ao CNPJ especifico: ${formatCnpj(clean)}`);
      } else {
        // 1. Empresas vinculadas ao Gov.br do procurador
        const vinculadas = await fapClient.getEmpresasVinculadas();
        await logger.log("info", `Empresas vinculadas ao Gov.br encontradas: ${vinculadas.length}`);
        for (const vinc of vinculadas) {
          const raiz = extractCnpjRaiz(vinc.cnpj);
          if (raiz && !targetMap.has(raiz)) {
            targetMap.set(raiz, {
              cnpj: vinc.cnpj,
              cnpjRaiz: raiz,
              corporateName: vinc.razaoSocial,
              source: "govbr_vinculadas",
            });
          }
        }

        // 2. Procuracoes diretas cadastradas no Dataprev
        const dataprevProcs = await fapClient.getProcuracoesDataprev();
        await logger.log("info", `Procuracoes diretas Dataprev encontradas: ${dataprevProcs.length}`);
        for (const proc of dataprevProcs) {
          const raiz = extractCnpjRaiz(proc.cnpj);
          if (raiz && !targetMap.has(raiz)) {
            targetMap.set(raiz, {
              cnpj: proc.cnpj.length === 14 ? proc.cnpj : `${proc.cnpj}000100`.slice(0, 14),
              cnpjRaiz: raiz,
              corporateName: proc.nome,
              source: "fap_procuracoes",
            });
          }
        }
      }

      let targets = [...targetMap.values()];

      // Cruzamento opcional com Dominio Ativas
      if (dominioResult && !options.specificCnpj) {
        const activeRaizes = new Set([...dominioResult.activeCnpjs].map((c) => extractCnpjRaiz(c)));
        const antes = targets.length;
        targets = targets.filter((t) => activeRaizes.has(t.cnpjRaiz));
        await logger.log(
          "info",
          `Filtro Dominio ativo aplicado: ${targets.length} empresas selecionadas de ${antes} encontradas no Gov.br/Dataprev.`,
        );
      }

      if (options.maxCompanies && options.maxCompanies > 0) {
        targets = targets.slice(0, options.maxCompanies);
        await logger.log("info", `Limitando execucao a ${targets.length} empresa(s) conforme opcao configurada.`);
      }

      await logger.log("info", `Iniciando consulta do FAP para ${targets.length} empresa(s)...`);

      let processedCount = 0;
      for (const target of targets) {
        processedCount += 1;
        const domCompany = dominioResult?.companies.find(
          (d) => extractCnpjRaiz(d.cnpj) === target.cnpjRaiz,
        );
        const dominioCode = domCompany?.codiEmp ?? null;

        await logger.log(
          "info",
          `[${processedCount}/${targets.length}] Consultando FAP da empresa ${target.cnpjRaiz} - ${target.corporateName}...`,
        );

        let estabelecimentosCnpjs: string[] = [];
        try {
          estabelecimentosCnpjs = await fapClient.getEstabelecimentos(anoVigencia, target.cnpjRaiz);
        } catch (error) {
          const fapError = error instanceof FapRequestError ? error : null;
          const statusHttp = fapError?.httpStatus ?? null;
          const is403 = statusHttp === 403;

          empresasSummary.push({
            dominioCode,
            cnpjRaiz: target.cnpjRaiz,
            corporateName: target.corporateName,
            source: target.source,
            estabelecimentosEncontrados: 0,
            estabelecimentosProcessados: 0,
            status: is403 ? "sem_procuracao" : "falha",
            error: sanitizeText(error),
          });

          failures.push({
            cnpj: target.cnpj,
            corporateName: target.corporateName,
            stage: "estabelecimentos",
            category: is403 ? "authorization" : fapError?.category ?? "unknown",
            httpStatus: statusHttp,
            message: sanitizeText(error),
            retryable: !is403,
          });

          await logger.log(
            is403 ? "warn" : "error",
            `Empresa ${target.cnpjRaiz}: ${is403 ? "Sem procuracao autorizada no FAP (403)" : sanitizeText(error)}`,
          );
          continue;
        }

        if (estabelecimentosCnpjs.length === 0) {
          empresasSummary.push({
            dominioCode,
            cnpjRaiz: target.cnpjRaiz,
            corporateName: target.corporateName,
            source: target.source,
            estabelecimentosEncontrados: 0,
            estabelecimentosProcessados: 0,
            status: "sem_estabelecimentos",
            error: "Nenhum estabelecimento retornado pela API",
          });
          await logger.log("warn", `Empresa ${target.cnpjRaiz}: Nenhum estabelecimento retornado.`);
          continue;
        }

        let estabProcessados = 0;
        for (const estabCnpj of estabelecimentosCnpjs) {
          try {
            // Busca dados cadastrais e calculos
            const [estabInfo, calculos] = await Promise.all([
              fapClient.getEstabelecimentoInfo(anoVigencia, estabCnpj).catch(() => null),
              fapClient.getCalculosFap(anoVigencia, estabCnpj).catch(() => []),
            ]);

            const razaoSocial = estabInfo?.razaoSocial || target.corporateName;

            if (!calculos || calculos.length === 0) {
              estabelecimentosResults.push({
                dominioCode,
                cnpjRaiz: target.cnpjRaiz,
                cnpj: estabCnpj,
                razaoSocial,
                anoVigencia,
                consultaCompetencia,
                fap: "-",
                fapOriginal: "-",
                cnaeSubclasse: "-",
                cnaeDescricao: "-",
                dataProcessamento: "-",
                tipoProcessamento: "-",
                taxaRotatividade: "-",
                massaSalarial: "-",
                mediaVinculos: "-",
                beneficiosPagos: "-",
                quantidadeCat: 0,
                quantidadeB91: 0,
                quantidadeB92: 0,
                quantidadeB93: 0,
                quantidadeB94: 0,
                indiceFrequencia: "-",
                indiceGravidade: "-",
                indiceCusto: "-",
                percentilFrequencia: "-",
                percentilGravidade: "-",
                percentilCusto: "-",
                bloqueado: Boolean(estabInfo?.bloqueado),
                reprocessado: Boolean(estabInfo?.reprocessadoPorEstabelecimento),
                mensagens: "",
                status: "sem_calculo",
              });
              await logger.log("info", `  -> Estabelecimento ${formatCnpj(estabCnpj)}: Sem calculo FAP publicado.`);
            } else {
              for (const calc of calculos) {
                estabProcessados += 1;
                estabelecimentosResults.push({
                  dominioCode,
                  cnpjRaiz: target.cnpjRaiz,
                  cnpj: estabCnpj,
                  razaoSocial,
                  anoVigencia,
                  consultaCompetencia,
                  fap: calc.fap ?? "-",
                  fapOriginal: calc.fapOriginal ?? "-",
                  cnaeSubclasse: stringValue(calc.cnae?.subClasse),
                  cnaeDescricao: stringValue(calc.cnae?.descricao),
                  dataProcessamento: stringValue(calc.dataProcessamento),
                  tipoProcessamento: stringValue(calc.tipoProcessamento),
                  taxaRotatividade: calc.taxaMediaRotatividade ?? "-",
                  massaSalarial: calc.valorTotalMassaSalarial ?? "-",
                  mediaVinculos: calc.mediaVinculos ?? "-",
                  beneficiosPagos: calc.valorTotalBeneficiosPagos ?? "-",
                  quantidadeCat: Number(calc.quantidadeCat ?? 0),
                  quantidadeB91: Number(calc.quantidadeB91 ?? 0),
                  quantidadeB92: Number(calc.quantidadeB92 ?? 0),
                  quantidadeB93: Number(calc.quantidadeB93 ?? 0),
                  quantidadeB94: Number(calc.quantidadeB94 ?? 0),
                  indiceFrequencia: calc.indiceFrequencia ?? "-",
                  indiceGravidade: calc.indiceGravidade ?? "-",
                  indiceCusto: calc.indiceCusto ?? "-",
                  percentilFrequencia: calc.percentilFrequencia ?? "-",
                  percentilGravidade: calc.percentilGravidade ?? "-",
                  percentilCusto: calc.percentilCusto ?? "-",
                  bloqueado: Boolean(estabInfo?.bloqueado),
                  reprocessado: Boolean(estabInfo?.reprocessadoPorEstabelecimento),
                  mensagens: "",
                  status: "processado",
                });
                await logger.log(
                  "info",
                  `  -> Estabelecimento ${formatCnpj(estabCnpj)}: FAP ${calc.fap} (Original: ${calc.fapOriginal}) | CNAE: ${calc.cnae?.subClasse || "-"}`,
                );
              }
            }
          } catch (errEstab) {
            failures.push({
              cnpj: estabCnpj,
              corporateName: target.corporateName,
              stage: "calculos",
              category: "unknown",
              httpStatus: null,
              message: sanitizeText(errEstab),
              retryable: true,
            });
            await logger.log("error", `  -> Falha no estabelecimento ${formatCnpj(estabCnpj)}: ${sanitizeText(errEstab)}`);
          }
        }

        empresasSummary.push({
          dominioCode,
          cnpjRaiz: target.cnpjRaiz,
          corporateName: target.corporateName,
          source: target.source,
          estabelecimentosEncontrados: estabelecimentosCnpjs.length,
          estabelecimentosProcessados: estabProcessados,
          status: "processada",
          error: "",
        });
      }
    }
  } finally {
    await closeBrowserSession(session);
  }

  const finishedAt = new Date();
  const validFaps = estabelecimentosResults.filter((e) => e.status === "processado").length;

  const report: RunReport = {
    schemaVersion: "1.0",
    collectorVersion: COLLECTOR_VERSION,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    timezone: "America/Sao_Paulo",
    anoVigencia: anoVigencia || new Date().getFullYear(),
    consultaCompetencia,
    ...(vigenciaDetalhe ? { vigenciaDetalhe } : {}),
    summary: {
      empresasAlvo: empresasSummary.length,
      empresasProcessadas: empresasSummary.filter((e) => e.status === "processada").length,
      empresasSemProcuracao: empresasSummary.filter((e) => e.status === "sem_procuracao").length,
      empresasComFalha: empresasSummary.filter((e) => e.status === "falha").length,
      totalEstabelecimentos: estabelecimentosResults.length,
      totalCalculosFap: validFaps,
      ...(dominioResult ? { dominioEmpresasAtivas: dominioResult.companies.length } : {}),
    },
    empresas: empresasSummary,
    estabelecimentos: estabelecimentosResults,
    falhas: failures,
  };

  const files = await writeReports(runDir, report);
  const exitCode: 0 | 1 | 2 = fatal
    ? 1
    : failures.length > 0 || empresasSummary.some((e) => e.status === "falha")
      ? 2
      : 0;

  await logger.log("info", "========================================================");
  await logger.log(
    "info",
    `Execucao finalizada com codigo ${exitCode}. Relatorios gerados com sucesso em ${runDir}:`,
  );
  await logger.log("info", `  - Planilha Excel: ${files.workbookPath}`);
  await logger.log("info", `  - Calculos CSV:  ${files.estabelecimentosCsvPath}`);
  await logger.log("info", `  - Empresas CSV:  ${files.empresasCsvPath}`);
  await logger.log("info", `  - JSON Canônico: ${files.jsonPath}`);
  await logger.log("info", "========================================================");

  return { exitCode, runDir, report, files };
}
