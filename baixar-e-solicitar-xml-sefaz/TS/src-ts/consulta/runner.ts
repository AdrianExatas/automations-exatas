import { existsSync } from "node:fs";
import { join } from "node:path";
import { read, utils } from "xlsx";
import { PATHS, SENHA_SEFAZ, USUARIO_SEFAZ, validarConfiguracaoCompleta, validarConfiguracoes } from "../core/config.js";
import { SIMBOLOS } from "../core/constants.js";
import { SefazHttpClient, SefazHttpError } from "../sefaz-http/client.js";
import { formatDateBr, formatDateIso, parseIsoDate } from "../utils/dates.js";
import { acquireFileLock } from "../utils/lock.js";
import { createLogger } from "../utils/logger.js";
import {
  calcularDiasPendentes,
  carregarHistorico,
  exibirStatusHistorico,
  type HistoricoConsulta,
  obterDataOntem,
  salvarHistorico,
} from "./historico.js";

type Combinacao = [string, string];

function obterUltimaDataNoHistorico(historico: HistoricoConsulta, inscricao: string): Date | undefined {
  const value = historico.empresas[String(inscricao)]?.ultima_data_processada;
  return value ? parseIsoDate(value) : undefined;
}

function atualizarHistoricoEmMemoria(
  historico: HistoricoConsulta,
  inscricao: string,
  dataProcessada: Date,
  tipoArquivo: string,
  pesquisarPor: string,
): void {
  const key = String(inscricao);
  historico.empresas[key] = {
    ...(historico.empresas[key] ?? {}),
    ultima_data_processada: formatDateIso(dataProcessada),
    ultima_atualizacao: new Date().toISOString(),
    tipo_arquivo: tipoArquivo,
    pesquisar_por: pesquisarPor,
  };
}

export function lerCombinacoesPlanilha(): Combinacao[] {
  const caminhoExemplo = join(PATHS.projectRoot, "exemplo_planilha", "DATE_TODAS_empresas_ATUALIZADA.xlsx");
  try {
    if (existsSync(caminhoExemplo)) {
      const workbook = read(caminhoExemplo);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (firstSheet) {
        const rows = utils.sheet_to_json<Record<string, unknown>>(firstSheet);
        const combinacoes: Combinacao[] = [];
        for (const row of rows) {
          const tipo = String(row["Tipo de Arquivo"] ?? "").trim();
          const pesquisar = String(row["Pesquisar Por"] ?? "").trim();
          if (tipo && pesquisar && !combinacoes.some(([a, b]) => a === tipo && b === pesquisar)) {
            combinacoes.push([tipo, pesquisar]);
          }
        }
        if (combinacoes.length) {
          return combinacoes;
        }
      }
    }
  } catch (error) {
    console.warn(`[AVISO] Nao foi possivel ler planilha de exemplo: ${String(error)}`);
  }

  return [
    ["NFE", "Emitida"],
    ["NFE", "Recebida"],
    ["NFE", "Inutilizadas"],
    ["NFC", "Nota"],
    ["NFC", "Inutilização"],
    ["CTE", "Emitente"],
  ];
}

export async function executarCapturaContinuaHttp(options: {
  headless?: boolean;
  forcarData?: Date;
  dataInicial?: Date;
  dataFinal?: Date;
} = {}): Promise<boolean> {
  const logger = createLogger("captura_continua_http_ts");

  console.log("=".repeat(70));
  console.log("CAPTURA CONTINUA DE XMLs VIA HTTP (TS/Bun)");
  console.log("=".repeat(70));
  console.log(`Data/Hora: ${new Date().toLocaleString("pt-BR")}`);
  console.log("Modo: HTTP autenticado");
  console.log("=".repeat(70));

  const [configCompleta, errosConfig] = validarConfiguracaoCompleta();
  if (!configCompleta) {
    for (const erro of errosConfig) {
      logger.error(`  - ${erro}`);
    }
    return false;
  }

  const lock = acquireFileLock(join(PATHS.lockDir, "sefaz_global.lock"), "Ja existe uma execucao do SEFAZ em andamento");
  try {
    const usarIntervalo = Boolean(options.dataInicial && options.dataFinal);
    const dataAlvo = options.forcarData ?? obterDataOntem();

    if (usarIntervalo) {
      if (!options.dataInicial || !options.dataFinal) {
        throw new Error("Intervalo incompleto");
      }
      console.log(`\nData inicial/final: ${formatDateBr(options.dataInicial)} ate ${formatDateBr(options.dataFinal)}`);
      if (options.dataInicial > options.dataFinal) {
        console.log(`${SIMBOLOS.erro} Data inicial maior que data final!`);
        return false;
      }
    } else {
      console.log(`\nData alvo para processamento: ${formatDateBr(dataAlvo)}`);
    }

    const historico = carregarHistorico();
    console.log(`Empresas ja rastreadas no historico: ${Object.keys(historico.empresas).length}`);

    const [configValida, mensagemConfig] = validarConfiguracoes();
    if (!configValida) {
      console.log(`${SIMBOLOS.erro} ${mensagemConfig}`);
      return false;
    }

    console.log("\n[ETAPA 1/3] Autenticando cliente HTTP...");
    const client = new SefazHttpClient();
    await client.login(USUARIO_SEFAZ, SENHA_SEFAZ);
    console.log(`${SIMBOLOS.login} Login HTTP realizado`);

    console.log("\n[ETAPA 2/3] Extraindo empresas do portal...");
    const combinacoes = lerCombinacoesPlanilha();
    console.log(`${SIMBOLOS.info} Combinacoes a processar: ${combinacoes.length}`);
    const empresas = await client.listarEmpresas();
    if (!empresas.length) {
      console.log(`${SIMBOLOS.erro} Nenhuma empresa encontrada!`);
      return false;
    }
    console.log(`${SIMBOLOS.sucesso} ${empresas.length} empresas encontradas`);

    await client.preflightSolicitacao(empresas[0]?.inscricao ?? "");

    console.log("\n[ETAPA 3/3] Processando solicitacoes via HTTP...");
    let totalSolicitacoes = 0;
    let totalSucesso = 0;
    let totalErros = 0;
    let empresasProcessadas = 0;
    let historicoAlterado = false;

    for (const [idx, empresa] of empresas.entries()) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`[${idx + 1}/${empresas.length}] ${empresa.nome.slice(0, 40)}`);
      console.log(`    Inscricao: ${empresa.inscricao}`);

      for (const [tipoArquivo, pesquisarPor] of combinacoes) {
        const chaveHistorico = `${empresa.inscricao}_${tipoArquivo}_${pesquisarPor}`;
        let dataInicialIntervalo = options.dataInicial;
        let dataFinalIntervalo = options.dataFinal;

        if (!usarIntervalo) {
          const ultimaData = obterUltimaDataNoHistorico(historico, chaveHistorico);
          const diasPendentes = calcularDiasPendentes(ultimaData, dataAlvo);
          if (!diasPendentes.length) {
            console.log(`    ${tipoArquivo}/${pesquisarPor}: Ja processado ate ${formatDateBr(dataAlvo)}`);
            continue;
          }
          dataInicialIntervalo = diasPendentes[0];
          dataFinalIntervalo = diasPendentes[diasPendentes.length - 1];
        }

        if (!dataInicialIntervalo || !dataFinalIntervalo) {
          continue;
        }

        totalSolicitacoes += 1;
        const dataInicialFormatada = formatDateBr(dataInicialIntervalo);
        const dataFinalFormatada = formatDateBr(dataFinalIntervalo);
        process.stdout.write(`       -> Solicitando XMLs ${tipoArquivo}/${pesquisarPor} de ${dataInicialFormatada} ate ${dataFinalFormatada}... `);

        try {
          const resultado = await client.solicitarXml({
            inscricao_municipal: empresa.inscricao,
            tipo_arquivo: tipoArquivo,
            pesquisar_por: pesquisarPor,
            data_inicial: dataInicialFormatada,
            data_final: dataFinalFormatada,
          });
          console.log("[OK]");
          if (resultado.aviso) {
            console.log(`         [AVISO] ${resultado.aviso.slice(0, 80)}`);
          }
          totalSucesso += 1;
          atualizarHistoricoEmMemoria(historico, chaveHistorico, dataFinalIntervalo, tipoArquivo, pesquisarPor);
          historicoAlterado = true;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.log(`[ERRO] ${message.slice(0, 80)}`);
          logger.error(`Falha ao processar ${empresa.inscricao}/${tipoArquivo}/${dataInicialFormatada}-${dataFinalFormatada}: ${message}`);
          totalErros += 1;
        }
      }
      if (historicoAlterado && salvarHistorico(historico)) {
        historicoAlterado = false;
      }
      empresasProcessadas += 1;
    }

    if (historicoAlterado) {
      salvarHistorico(historico);
    }

    console.log("\n" + "=".repeat(70));
    console.log("RESUMO DA EXECUCAO");
    console.log("=".repeat(70));
    console.log(`Empresas processadas: ${empresasProcessadas}/${empresas.length}`);
    console.log(`Total de solicitacoes: ${totalSolicitacoes}`);
    console.log(`  [OK] Sucesso: ${totalSucesso}`);
    console.log(`  [ERRO] Erros: ${totalErros}`);
    console.log("=".repeat(70));
    exibirStatusHistorico();
    return totalErros === 0 || totalSucesso > 0;
  } finally {
    lock.release();
  }
}

export async function executarCapturaComFallback(options: {
  headless?: boolean;
  dataInicial?: Date;
  dataFinal?: Date;
  selenium?: boolean;
}): Promise<boolean> {
  if (options.selenium) {
    throw new SefazHttpError("Fluxo Selenium legado nao foi portado para TS; use o fluxo HTTP ou mantenha o Python para esse fallback.");
  }
  return executarCapturaContinuaHttp(options);
}
