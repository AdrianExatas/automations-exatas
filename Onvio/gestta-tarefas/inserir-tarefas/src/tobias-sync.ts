import { chunkArray } from "./utils";
import { resumirLinks } from "./sync";
import { ClienteResumo, ProgressoLogEvento, ResultadoTarefa, VinculoTarefaCliente } from "./types";

const CHUNK_SIZE = 100;
const DEFAULT_POST_ADD_ATTEMPTS = 40;
const DEFAULT_POLL_INTERVAL_MS = 3000;

export interface EmpresaTobiasResolvida extends ClienteResumo {
  customerId: string;
  customerName: string;
  cnpj: string;
}

export interface TarefaTobiasResolvida {
  taskId: string;
  taskName: string;
}

export interface InclusaoAditivaApi {
  listTaskCustomers(taskId: string): Promise<VinculoTarefaCliente[]>;
  addCustomersToTask(taskId: string, customerIds: string[]): Promise<void>;
}

export interface InclusaoAditivaOptions {
  postAddAttempts?: number;
  pollIntervalMs?: number;
  wait?: (ms: number) => Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function criarResultado(
  tarefa: TarefaTobiasResolvida,
  empresas: EmpresaTobiasResolvida[],
  dryRun: boolean,
): ResultadoTarefa {
  return {
    tarefaPlanilha: tarefa.taskName,
    tarefaGestta: tarefa.taskName,
    taskId: tarefa.taskId,
    dryRun,
    sucesso: false,
    totalEmpresasPlanilha: empresas.length,
    vinculosAtuais: 0,
    extras: 0,
    inclusoes: 0,
    patchLinks: 0,
    patchGrupos: 0,
    mensagem: "",
    detalhes: [],
  };
}

function registrarEmpresa(
  resultado: ResultadoTarefa,
  tarefa: TarefaTobiasResolvida,
  empresa: EmpresaTobiasResolvida,
  nivel: ProgressoLogEvento["nivel"],
  etapa: ProgressoLogEvento["etapa"],
  mensagem: string,
): void {
  const timeline = resultado.timeline ?? [];
  timeline.push({
    timestamp: new Date().toISOString(),
    nivel,
    etapa,
    tarefa: tarefa.taskName,
    customerId: empresa.customerId,
    customerName: empresa.customerName,
    cnpj: empresa.cnpj,
    mensagem,
  });
  resultado.timeline = timeline;
}

export function calcularInclusoesAditivas(
  empresas: EmpresaTobiasResolvida[],
  vinculosAtuais: VinculoTarefaCliente[],
): EmpresaTobiasResolvida[] {
  const customerIdsAtuais = new Set(
    resumirLinks(vinculosAtuais).map((vinculo) => vinculo.customerId),
  );
  return empresas.filter((empresa) => !customerIdsAtuais.has(empresa.customerId));
}

export async function executarInclusaoAditiva(
  api: InclusaoAditivaApi,
  tarefa: TarefaTobiasResolvida,
  empresas: EmpresaTobiasResolvida[],
  dryRun: boolean,
  options: InclusaoAditivaOptions = {},
): Promise<ResultadoTarefa> {
  const resolvedOptions = {
    postAddAttempts: options.postAddAttempts ?? DEFAULT_POST_ADD_ATTEMPTS,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    wait: options.wait ?? delay,
  };
  const resultado = criarResultado(tarefa, empresas, dryRun);

  let vinculosAtuais: VinculoTarefaCliente[];
  try {
    vinculosAtuais = await api.listTaskCustomers(tarefa.taskId);
  } catch (error) {
    resultado.etapaFalha = "listarVinculosAtuais";
    resultado.mensagem = `Erro ao listar os vinculos atuais da tarefa ${tarefa.taskName}.`;
    resultado.detalhes.push(error instanceof Error ? error.message : String(error));
    return resultado;
  }

  const inclusoes = calcularInclusoesAditivas(empresas, vinculosAtuais);
  resultado.vinculosAtuais = vinculosAtuais.length;
  resultado.vinculosAtuaisDetalhes = resumirLinks(vinculosAtuais);
  resultado.inclusoes = inclusoes.length;
  resultado.inclusoesSolicitadas = inclusoes.map((empresa) => ({ ...empresa }));
  const customerIdsParaIncluir = new Set(inclusoes.map((empresa) => empresa.customerId));
  for (const empresa of empresas) {
    registrarEmpresa(
      resultado,
      tarefa,
      empresa,
      "info",
      "listar-vinculos",
      customerIdsParaIncluir.has(empresa.customerId)
        ? "vinculo ausente; inclusao aditiva planejada."
        : "vinculo existente preservado.",
    );
  }

  if (dryRun) {
    resultado.sucesso = true;
    resultado.vinculosFinais = vinculosAtuais.length + inclusoes.length;
    resultado.mensagem =
      `Dry-run: ${inclusoes.length} inclusao(oes) prevista(s); ` +
      `${vinculosAtuais.length} vinculo(s) atual(is) serao preservados.`;
    return resultado;
  }

  try {
    for (const chunk of chunkArray(inclusoes.map((empresa) => empresa.customerId), CHUNK_SIZE)) {
      await api.addCustomersToTask(tarefa.taskId, chunk);
    }
  } catch (error) {
    resultado.etapaFalha = "adicionarAusentes";
    resultado.mensagem = `Erro ao adicionar empresas na tarefa ${tarefa.taskName}.`;
    resultado.detalhes.push(error instanceof Error ? error.message : String(error));
    return resultado;
  }

  let vinculosFinais: VinculoTarefaCliente[] = [];
  let empresasAusentes: EmpresaTobiasResolvida[] = empresas;
  try {
    for (let attempt = 1; attempt <= resolvedOptions.postAddAttempts; attempt += 1) {
      vinculosFinais = await api.listTaskCustomers(tarefa.taskId);
      empresasAusentes = calcularInclusoesAditivas(empresas, vinculosFinais);
      if (empresasAusentes.length === 0) break;
      if (attempt < resolvedOptions.postAddAttempts) {
        await resolvedOptions.wait(resolvedOptions.pollIntervalMs);
      }
    }
  } catch (error) {
    resultado.etapaFalha = "listarVinculosAtuais";
    resultado.mensagem = `Erro ao validar os vinculos finais da tarefa ${tarefa.taskName}.`;
    resultado.detalhes.push(error instanceof Error ? error.message : String(error));
    return resultado;
  }

  resultado.vinculosFinais = vinculosFinais.length;
  resultado.vinculosEncontradosNaTarefa = empresas
    .filter((empresa) => !empresasAusentes.some((ausente) => ausente.customerId === empresa.customerId))
    .map((empresa) => ({ ...empresa }));

  if (empresasAusentes.length > 0) {
    resultado.etapaFalha = "adicionarAusentes";
    resultado.clientesAusentesNaTarefa = empresasAusentes.map((empresa) => ({ ...empresa }));
    resultado.mensagem =
      `${empresasAusentes.length} empresa(s) ainda nao aparecem na tarefa ${tarefa.taskName} ` +
      "apos a inclusao aditiva.";
    resultado.detalhes.push(
      ...empresasAusentes.map((empresa) => `${empresa.customerName} (${empresa.cnpj}) ainda nao aparece.`),
    );
    for (const empresa of empresasAusentes) {
      registrarEmpresa(
        resultado,
        tarefa,
        empresa,
        "error",
        "finalizar",
        "vinculo nao confirmado apos a inclusao aditiva.",
      );
    }
    return resultado;
  }

  for (const empresa of empresas) {
    registrarEmpresa(
      resultado,
      tarefa,
      empresa,
      "success",
      "finalizar",
      "vinculo confirmado; nenhum responsavel ou vinculo preexistente foi alterado.",
    );
  }

  resultado.sucesso = true;
  resultado.mensagem =
    `Aplicado com sucesso: ${inclusoes.length} inclusao(oes); ` +
    `${vinculosAtuais.length} vinculo(s) preexistente(s) preservado(s).`;
  return resultado;
}
