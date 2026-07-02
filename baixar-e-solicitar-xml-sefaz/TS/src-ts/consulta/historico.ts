import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PATHS } from "../core/config.js";
import { CapturaContinuaConfig } from "../core/constants.js";
import { addDays, diffDays, formatDateIso, parseIsoDate, yesterday } from "../utils/dates.js";
import { backupFile, readJsonFile, writeJsonAtomic } from "../utils/fs.js";

export interface HistoricoEmpresa {
  ultima_data_processada?: string;
  ultima_atualizacao?: string;
  tipo_arquivo?: string;
  pesquisar_por?: string;
}

export interface HistoricoConsulta {
  empresas: Record<string, HistoricoEmpresa>;
  ultima_execucao: string | null;
  versao: string;
}

export const MAX_DIAS_RECUPERACAO = CapturaContinuaConfig.maxDiasRecuperacao;
export const HISTORICO_FILE = join(PATHS.checkpointsDir, "historico_execucoes.json");

export function carregarHistorico(): HistoricoConsulta {
  if (!existsSync(HISTORICO_FILE)) {
    return { empresas: {}, ultima_execucao: null, versao: "1.0" };
  }
  try {
    const historico = readJsonFile<Partial<HistoricoConsulta>>(HISTORICO_FILE) ?? {};
    return {
      empresas: historico.empresas ?? {},
      ultima_execucao: historico.ultima_execucao ?? null,
      versao: historico.versao ?? "1.0",
    };
  } catch (error) {
    console.warn(`[AVISO] Historico corrompido: ${String(error)}`);
    try {
      renameSync(HISTORICO_FILE, `${HISTORICO_FILE}.corrupted`);
    } catch {
      // noop
    }
    return { empresas: {}, ultima_execucao: null, versao: "1.0" };
  }
}

export function salvarHistorico(historico: HistoricoConsulta): boolean {
  try {
    writeJsonAtomic(HISTORICO_FILE, { ...historico, ultima_execucao: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error(`[ERRO] Falha ao salvar historico: ${String(error)}`);
    return false;
  }
}

export function obterUltimaDataEmpresa(inscricao: string): Date | undefined {
  const empresa = carregarHistorico().empresas[String(inscricao)];
  const value = empresa?.ultima_data_processada;
  return value ? parseIsoDate(value) : undefined;
}

export function atualizarDataEmpresa(
  inscricao: string,
  dataProcessada: Date,
  tipoArquivo = "",
  pesquisarPor = "",
): boolean {
  const historico = carregarHistorico();
  const key = String(inscricao);
  historico.empresas[key] = {
    ...(historico.empresas[key] ?? {}),
    ultima_data_processada: formatDateIso(dataProcessada),
    ultima_atualizacao: new Date().toISOString(),
  };
  if (tipoArquivo) {
    historico.empresas[key].tipo_arquivo = tipoArquivo;
  }
  if (pesquisarPor) {
    historico.empresas[key].pesquisar_por = pesquisarPor;
  }
  return salvarHistorico(historico);
}

export function calcularDiasPendentes(
  ultimaData: Date | undefined,
  dataAtual: Date,
  maxDias = MAX_DIAS_RECUPERACAO,
): Date[] {
  if (!ultimaData) {
    return [dataAtual];
  }
  if (ultimaData >= dataAtual) {
    return [];
  }
  const diasDiferenca = diffDays(dataAtual, ultimaData);
  const dataInicio = diasDiferenca > maxDias ? addDays(dataAtual, -(maxDias - 1)) : addDays(ultimaData, 1);
  const dias: Date[] = [];
  for (let cursor = dataInicio; cursor <= dataAtual; cursor = addDays(cursor, 1)) {
    dias.push(cursor);
  }
  return dias;
}

export function obterResumoHistorico(): {
  totalEmpresas: number;
  ultimaExecucao: string | null;
  empresasDetalhes: Array<{ inscricao: string; ultimaData?: string; tipoArquivo: string; pesquisarPor: string }>;
} {
  const historico = carregarHistorico();
  const empresasDetalhes = Object.entries(historico.empresas)
    .map(([inscricao, dados]) => ({
      inscricao,
      ultimaData: dados.ultima_data_processada,
      tipoArquivo: dados.tipo_arquivo ?? "N/A",
      pesquisarPor: dados.pesquisar_por ?? "N/A",
    }))
    .sort((left, right) => (right.ultimaData ?? "").localeCompare(left.ultimaData ?? ""));

  return {
    totalEmpresas: empresasDetalhes.length,
    ultimaExecucao: historico.ultima_execucao,
    empresasDetalhes,
  };
}

export function exibirStatusHistorico(): void {
  const resumo = obterResumoHistorico();
  console.log("\n" + "=".repeat(60));
  console.log("[HISTORICO DE EXECUCOES]");
  console.log("=".repeat(60));
  console.log(`Total de empresas rastreadas: ${resumo.totalEmpresas}`);
  console.log(resumo.ultimaExecucao ? `Ultima execucao geral: ${resumo.ultimaExecucao}` : "Nenhuma execucao registrada ainda.");
  if (resumo.empresasDetalhes.length) {
    console.log("\nUltimas datas processadas por empresa:");
    for (const [index, empresa] of resumo.empresasDetalhes.slice(0, 10).entries()) {
      console.log(`  ${index + 1}. ${empresa.inscricao}: ${empresa.ultimaData ?? "N/A"} (${empresa.tipoArquivo})`);
    }
    if (resumo.empresasDetalhes.length > 10) {
      console.log(`  ... e mais ${resumo.empresasDetalhes.length - 10} empresas`);
    }
  }
  console.log("=".repeat(60) + "\n");
}

export function limparTodoHistorico(): boolean {
  if (!existsSync(HISTORICO_FILE)) {
    return true;
  }
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  const backupPath = join(PATHS.checkpointsBackupDir, `historico_execucoes_${timestamp}.json`);
  try {
    backupFile(HISTORICO_FILE, backupPath);
    console.log(`[BACKUP] Criado: ${backupPath}`);
  } catch (error) {
    console.warn(`[AVISO] Nao foi possivel criar backup: ${String(error)}`);
  }
  rmSync(HISTORICO_FILE, { force: true });
  console.log("[OK] Historico limpo com sucesso");
  return true;
}

export function obterDataOntem(): Date {
  return yesterday();
}
