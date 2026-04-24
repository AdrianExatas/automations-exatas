import { AxiosInstance } from "axios";
import { patchValidacao } from "./api/endpoints";
import {
  buscarClientePorCnpj,
  buscarUsuarioPorNome,
  obterGroupCustomerIds,
} from "./mapeamentos";
import {
  LinhaPlanilha,
  ModoExecucao,
  PatchValidacaoBody,
  ResultadoLinha,
} from "./types";

export const DEFAULT_APPROVE_TYPE = ["DONE", "DISCONSIDERED"] as const;

export function createPatchValidacaoBody(
  ids: string[],
  approverId: string,
): PatchValidacaoBody {
  return {
    ids,
    approvers: [approverId],
    approve: true,
    approve_type: [...DEFAULT_APPROVE_TYPE],
  };
}

export async function executarAtualizacaoValidacao(
  api: { patchValidacao: (body: PatchValidacaoBody) => Promise<void> },
  input: { ids: string[]; approverId: string; modo: ModoExecucao },
): Promise<{ executouPatch: boolean; body: PatchValidacaoBody }> {
  const body = createPatchValidacaoBody(input.ids, input.approverId);
  if (input.modo === "apply") {
    await api.patchValidacao(body);
    return { executouPatch: true, body };
  }

  return { executouPatch: false, body };
}

export async function processarLinha(
  client: AxiosInstance,
  linha: LinhaPlanilha,
  modo: ModoExecucao,
): Promise<ResultadoLinha> {
  const resultado: ResultadoLinha = {
    linha,
    sucesso: false,
    mensagem: "",
  };

  if (linha.cnpjInvalido || !linha.cnpj) {
    resultado.mensagem = "CNPJ invalido apos normalizacao";
    resultado.etapaFalha = "validarCnpj";
    return resultado;
  }

  let customer: Awaited<ReturnType<typeof buscarClientePorCnpj>>;
  try {
    customer = await buscarClientePorCnpj(client, linha.cnpj);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar cliente: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarCliente";
    return resultado;
  }

  if (!customer) {
    resultado.mensagem = `Cliente nao encontrado para CNPJ ${linha.cnpj}`;
    return resultado;
  }
  resultado.customerId = customer._id;

  let approver: Awaited<ReturnType<typeof buscarUsuarioPorNome>>;
  try {
    approver = await buscarUsuarioPorNome(client, linha.validador);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar aprovador: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarAprovador";
    return resultado;
  }

  if (!approver) {
    resultado.mensagem = `Aprovador nao encontrado: "${linha.validador}"`;
    return resultado;
  }
  resultado.approverId = approver._id;

  let ids: string[];
  try {
    ids = await obterGroupCustomerIds(client, customer._id, linha.setor);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao obter IDs group_customer: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "groupCustomerIds";
    return resultado;
  }
  resultado.groupIds = ids;

  if (ids.length === 0) {
    resultado.mensagem = `Nenhum vinculo group_customer encontrado para o setor ${linha.setor}.`;
    resultado.etapaFalha = "semGroupCustomer";
    return resultado;
  }

  try {
    const atualizacao = await executarAtualizacaoValidacao(
      { patchValidacao: (body) => patchValidacao(client, body) },
      { ids, approverId: approver._id, modo },
    );

    resultado.sucesso = true;
    resultado.mensagem =
      modo === "apply"
        ? `Validacao aplicada com sucesso em ${atualizacao.body.ids.length} vinculo(s).`
        : `Dry-run: validacao seria aplicada em ${atualizacao.body.ids.length} vinculo(s).`;
    return resultado;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao aplicar validacao (PATCH): ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "patchValidacao";
    return resultado;
  }
}
