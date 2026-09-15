import fs from "node:fs";
import path from "node:path";
import { launchBrowser } from "./browser/launch";
import { Checkpoint } from "./checkpoint";
import {
  DEFAULT_UNECONT_LOGIN_URL,
  DEFAULT_UNECONT_SERVICOS_TOMADOS_URL,
  type Config,
  validateConfig,
} from "./config";
import { EmpresaNotFoundError, NoNotasError } from "./exceptions";
import {
  computeEmpresaStats,
  ConferenciaNotasFlow,
} from "./flows/conferencia-notas-flow";
import { LoginFlow } from "./flows/login-flow";
import {
  writeChecklistMd,
  writeEventosReinfArtifacts,
} from "./domain/reinf-event-writers";
import { resolveEmpresasInput } from "./input";
import { resolveRuntimePath } from "./project-paths";
import type {
  ConferenciaNotasItemResult,
  ConferenciaNotasOptions,
  ConferenciaNotasResult,
  DownloadLogger,
  EmpresaBatchItem,
  NotaFiscalRow,
} from "./types";

function generateRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `ConferenciaReinf_${date}_${time}`;
}

function buildRuntimeConfig(options: ConferenciaNotasOptions): Config {
  return {
    unecontEmail: options.credentials.email,
    unecontSenha: options.credentials.senha,
    headless: options.browser?.headless ?? true,
    defaultTimeout: options.timeouts?.defaultTimeoutSeconds ?? 10,
    shortTimeout: options.timeouts?.shortTimeoutSeconds ?? 3,
    longTimeout: options.timeouts?.longTimeoutSeconds ?? 20,
    loginUrl: options.loginUrl ?? DEFAULT_UNECONT_LOGIN_URL,
    servicosTomadosUrl: options.servicosTomadosUrl ?? DEFAULT_UNECONT_SERVICOS_TOMADOS_URL,
    empresasUrl: "",
  };
}

function formatEmpresaLabel(empresa: EmpresaBatchItem): string {
  return `${empresa.codigo} - ${empresa.nome} (${empresa.cnpj})`;
}

function logMessage(
  logger: DownloadLogger | undefined,
  level: keyof DownloadLogger,
  message: string,
): void {
  if (logger) {
    logger[level](message);
    return;
  }
  const line = `${message}\n`;
  if (level === "error") process.stderr.write(line);
  else process.stdout.write(line);
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeNotasCsv(filePath: string, items: ConferenciaNotasItemResult[]): void {
  const header = [
    "CODIGO",
    "EMPRESA",
    "CNPJ_EMPRESA",
    "UNECONT_ID",
    "NUMERO_NFE",
    "CNPJ_PRESTADOR",
    "PRESTADOR",
    "DATA_COMPETENCIA",
    "DATA_EMISSAO",
    "VALOR_NFE",
    "VALOR_LIQUIDO",
    "STATUS_CONFERENCIA",
    "CANCELADA",
    "ORIGEM",
    "SITUACAO_RETENCOES",
    "SITUACAO_NFTS",
    "CLASSIFICACAO",
  ].join(",");

  const lines = [header];
  for (const item of items) {
    for (const nota of item.notas) {
      lines.push(
        [
          item.empresa.codigo,
          item.empresa.nome,
          item.empresa.cnpj,
          nota.unecontId ?? "",
          nota.numeroNfe,
          nota.cnpjPrestador,
          nota.prestador,
          nota.dataCompetencia,
          nota.dataEmissaoNfe,
          nota.valorNfe,
          nota.valorLiquido,
          nota.statusConferencia,
          nota.cancelada ? "sim" : "nao",
          nota.origem ?? "",
          nota.situacaoRetencoes,
          nota.situacaoNfts ?? "",
          nota.classificacao ?? "",
        ]
          .map((value) => csvEscape(String(value ?? "")))
          .join(","),
      );
    }
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}

function writeNaoConferidosCsv(filePath: string, items: ConferenciaNotasItemResult[]): void {
  const header = [
    "CODIGO",
    "EMPRESA",
    "CNPJ_EMPRESA",
    "UNECONT_ID",
    "NUMERO_NFE",
    "CNPJ_PRESTADOR",
    "PRESTADOR",
    "DATA_COMPETENCIA",
    "VALOR_NFE",
    "CANCELADA",
    "SITUACAO_RETENCOES",
    "CLASSIFICACAO",
    "CODIGO_SERVICO_LC",
    "SITUACAO",
    "DATA_CANCELAMENTO",
    "PERGUNTAS_PENDENTES",
    "VALIDACOES",
    "RET_ISS",
    "RET_IRRF",
    "RET_CSRF",
    "RET_INSS",
    "EVENTOS",
  ].join(",");

  const lines = [header];
  for (const item of items) {
    for (const nota of item.notas.filter((n) => n.statusConferencia === "nao_conferido")) {
      const d = nota.detalhe;
      lines.push(
        [
          item.empresa.codigo,
          item.empresa.nome,
          item.empresa.cnpj,
          nota.unecontId ?? "",
          nota.numeroNfe,
          nota.cnpjPrestador,
          nota.prestador,
          nota.dataCompetencia,
          nota.valorNfe,
          nota.cancelada ? "sim" : "nao",
          nota.situacaoRetencoes,
          nota.classificacao ?? "",
          d?.codigoDescricaoServico ?? "",
          d?.situacao ?? "",
          d?.dataCancelamento ?? "",
          (d?.perguntasPendentes || []).join(" | "),
          d?.validacoesTexto ?? "",
          d?.retencoes.iss ?? "",
          d?.retencoes.irrf ?? "",
          d?.retencoes.csrf ?? "",
          d?.retencoes.inss ?? "",
          d?.eventosTexto ?? "",
        ]
          .map((value) => csvEscape(String(value ?? "")))
          .join(","),
      );
    }
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}

function resolveOutputDir(options: ConferenciaNotasOptions, runId: string): string {
  if (options.outputDir?.trim()) {
    return path.resolve(options.outputDir);
  }
  return resolveRuntimePath("conferencia-reinf", runId);
}

export async function conferirNotasUnecont(
  options: ConferenciaNotasOptions,
): Promise<ConferenciaNotasResult> {
  const config = buildRuntimeConfig(options);
  validateConfig(config);

  const logger = options.logger;
  logMessage(logger, "info", "Carregando empresas da planilha...");
  const empresas = resolveEmpresasInput(options.input);
  const runId = generateRunId();
  const outputDir = resolveOutputDir(options, runId);
  fs.mkdirSync(outputDir, { recursive: true });
  logMessage(
    logger,
    "info",
    `${empresas.length} empresas carregadas. Saida: ${outputDir}`,
  );

  const checkpoint = options.checkpointPath
    ? new Checkpoint(path.resolve(options.checkpointPath))
    : null;
  checkpoint?.load();

  const items: ConferenciaNotasItemResult[] = [];
  let success = 0;
  let noNotas = 0;
  let notFound = 0;
  let failed = 0;
  let skipped = 0;
  let totalNotas = 0;
  let naoConferidos = 0;
  let canceladas = 0;
  let bloqueadasInteracao = 0;
  let candidatosR2010 = 0;
  let candidatosR4020 = 0;

  const { browser, page } = await launchBrowser({
    headless: config.headless,
    logger,
  });
  logMessage(logger, "info", "Navegador aberto.");

  try {
    logMessage(logger, "info", "Realizando login no UNECONT...");
    await new LoginFlow(page, config).execute();
    logMessage(logger, "info", "Login concluido.");

    const flow = new ConferenciaNotasFlow(page, config);
    const mesesAnteriores = options.mesesAnteriores ?? 0;

    for (const [index, empresa] of empresas.entries()) {
      const prefix = `[${index + 1}/${empresas.length}]`;
      const empresaLabel = formatEmpresaLabel(empresa);

      if (checkpoint?.isProcessed(empresa.cnpj)) {
        skipped++;
        items.push({
          empresa,
          status: "skipped",
          message: "Empresa ja processada no checkpoint",
          notas: [],
        });
        logMessage(logger, "info", `${prefix} Pulada: ${empresaLabel} (checkpoint)`);
        continue;
      }

      logMessage(logger, "info", `${prefix} Processando ${empresaLabel}`);

      try {
        await flow.selectEmpresa(empresa.cnpj);
        await flow.navigateToServicosTomados();
        let notas = await flow.listarNotas(empresa.cnpj, mesesAnteriores);
        const totais = await flow.readTotais();

        logMessage(
          logger,
          "info",
          `${prefix} Competencia: ${totais.competenciaLabel || "?"} | ${notas.length} nota(s) na grade`,
        );

        notas = await flow.enriquecerNaoConferidos(notas, {
          somenteNaoConferidos: options.somenteNaoConferidos !== false,
          amostraCanceladas: options.amostraCanceladas === true,
          logger,
        });

        const stats = computeEmpresaStats(notas);
        totalNotas += notas.length;
        naoConferidos += stats.naoConferidos;
        canceladas += stats.canceladas;
        bloqueadasInteracao += stats.bloqueadasInteracao;
        candidatosR2010 += stats.candidatosR2010;
        candidatosR4020 += stats.candidatosR4020;

        checkpoint?.markSuccess(empresa.cnpj);
        success++;
        items.push({
          empresa,
          status: "success",
          message: `${notas.length} nota(s); ${stats.naoConferidos} nao conferido(s); ${stats.ativasAbertas} detalhe(s)`,
          notas,
          totais,
          stats,
        });
        logMessage(
          logger,
          "info",
          `${prefix} Concluida: ${empresaLabel} -> ${notas.length} nota(s) | ` +
            `naoConf=${stats.naoConferidos} ativasAbertas=${stats.ativasAbertas} ` +
            `bloqueadas=${stats.bloqueadasInteracao} canceladas=${stats.canceladas}`,
        );
        if (logger) {
          console.table(
            notas
              .filter((n) => n.statusConferencia === "nao_conferido")
              .map((nota: NotaFiscalRow) => ({
                nfe: nota.numeroNfe,
                prestador: nota.prestador.slice(0, 40),
                cancelada: nota.cancelada ? "sim" : "nao",
                classif: nota.classificacao,
                perguntas: nota.detalhe?.perguntasPendentes?.length ?? 0,
              })),
          );
        }
      } catch (error) {
        if (error instanceof EmpresaNotFoundError) {
          checkpoint?.markNotFound(empresa.cnpj);
          notFound++;
          items.push({
            empresa,
            status: "not_found",
            message: error.message,
            notas: [],
          });
          logMessage(logger, "warn", `${prefix} Empresa nao encontrada: ${empresaLabel}`);
          continue;
        }

        if (error instanceof NoNotasError) {
          checkpoint?.markNoNotas(empresa.cnpj);
          noNotas++;
          items.push({
            empresa,
            status: "no_notas",
            message: error.message,
            notas: [],
          });
          logMessage(logger, "warn", `${prefix} Sem notas: ${empresaLabel}`);
          continue;
        }

        checkpoint?.markFailed(empresa.cnpj);
        failed++;
        items.push({
          empresa,
          status: "failed",
          message: error instanceof Error ? error.message : String(error),
          notas: [],
        });
        logMessage(
          logger,
          "error",
          `${prefix} Falha: ${empresaLabel} -> ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (checkpoint) {
      const checkpointStats = checkpoint.getStats();
      const completedInCheckpoint =
        checkpointStats.processed + checkpointStats.no_notas + checkpointStats.not_found;
      if (checkpointStats.failed === 0 && completedInCheckpoint >= empresas.length) {
        checkpoint.clear();
      }
    }

    const summary = {
      total: empresas.length,
      success,
      noNotas,
      notFound,
      failed,
      skipped,
      totalNotas,
      naoConferidos,
      canceladas,
      bloqueadasInteracao,
      candidatosR2010,
      candidatosR4020,
    };

    const csvPath = path.join(outputDir, "notas.csv");
    const naoConferidosCsvPath = path.join(outputDir, "nao-conferidos.csv");
    const summaryPath = path.join(outputDir, "resumo.json");
    const checklistPath = path.join(outputDir, "checklist-reinf.md");

    writeNotasCsv(csvPath, items);
    writeNaoConferidosCsv(naoConferidosCsvPath, items);
    const { eventos, eventosJsonPath, eventosCsvPath } = writeEventosReinfArtifacts(
      outputDir,
      runId,
      items,
    );
    writeChecklistMd(checklistPath, items, summary, eventos);
    fs.writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          runId,
          outputDir,
          summary,
          eventosJsonPath,
          eventosCsvPath,
          totalEventosRascunho: eventos.length,
          items,
        },
        null,
        2,
      ),
      "utf-8",
    );

    logMessage(
      logger,
      "info",
      `Resumo: ${success} sucesso, ${noNotas} sem notas, ${notFound} nao encontradas, ` +
        `${failed} falhas, ${skipped} puladas, ${totalNotas} notas | ` +
        `naoConf=${naoConferidos} canceladas=${canceladas} bloqueadas=${bloqueadasInteracao} ` +
        `R2010=${candidatosR2010} R4020=${candidatosR4020} eventosRascunho=${eventos.length}`,
    );

    return {
      runId,
      outputDir,
      csvPath,
      naoConferidosCsvPath,
      summaryPath,
      checklistPath,
      eventosJsonPath,
      eventosCsvPath,
      summary,
      items,
    };
  } finally {
    await browser.close();
  }
}
