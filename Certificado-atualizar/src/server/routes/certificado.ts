/**
 * Handlers das rotas da API de certificados.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { SiegCertificadoClient, type CertificadoRequestEdit } from "../sieg-client.js";
import { extrairCnpjDoPfx } from "../extrair-cnpj-pfx.js";
import { sendJson, readRequestJson } from "../utils/http.js";
import {
  parseMultipartRequest,
  getMultipartText,
  getMultipartFile,
} from "../utils/multipart.js";

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  query: URLSearchParams
) => Promise<void>;

/**
 * POST /api/certificado/extrair-cnpj
 * Extrai o CNPJ de um arquivo PFX. Não requer SIEG_API_KEY.
 */
export const extrairCnpjHandler: Handler = async (req, res) => {
  const parsed = await parseMultipartRequest(req);
  if (!parsed) {
    sendJson(res, 400, {
      success: false,
      error: "Content-Type multipart/form-data com boundary é obrigatório.",
    });
    return;
  }

  const { parts } = parsed;
  const file = getMultipartFile(parts, "certificado", "arquivo", "pfx");
  const senha = getMultipartText(parts, "senha");

  if (!file?.data?.length) {
    sendJson(res, 400, {
      success: false,
      error: "Envie o arquivo do certificado (PFX).",
    });
    return;
  }

  if (!senha) {
    sendJson(res, 400, {
      success: false,
      error: "Campo 'senha' é obrigatório.",
    });
    return;
  }

  const result = extrairCnpjDoPfx(file.data, senha);
  if (result.ok) {
    sendJson(res, 200, { success: true, data: { cnpj: result.cnpj } });
  } else {
    sendJson(res, 200, { success: false, error: result.mensagem });
  }
};

/**
 * GET /api/certificado/listar
 * Lista certificados com filtros opcionais.
 */
export const listarHandler: Handler = async (_req, res, query) => {
  const client = new SiegCertificadoClient();

  const active = query.get("active");
  const pagina = query.get("pagina");
  const todos = query.get("todos");
  const cnpj = query.get("cnpj");
  const activeValue = active === "false" ? false : true;

  // Busca por CNPJ específico
  if (cnpj) {
    const result = await client.buscarPorCnpj(cnpj, activeValue);
    sendJson(res, 200, {
      success: result.ok,
      data: result.certificado ? [result.certificado] : [],
      message: result.mensagem,
    });
    return;
  }

  // Todos os certificados (todas as páginas)
  if (todos === "true" || todos === "1") {
    const result = await client.listarTodosCertificados(activeValue);
    sendJson(res, 200, {
      success: result.ok,
      data: result.data,
      message: result.mensagem,
    });
    return;
  }

  // Apenas uma página
  const paginaNum =
    pagina !== null && pagina !== "" ? parseInt(pagina, 10) : undefined;
  const result = await client.listarCertificados(activeValue, paginaNum);
  sendJson(res, 200, {
    success: result.ok,
    data: result.data,
    message: result.mensagem,
  });
};

/**
 * GET /api/certificado/status
 * Obtém status de um certificado específico.
 */
export const statusHandler: Handler = async (_req, res, query) => {
  const client = new SiegCertificadoClient();

  const id = query.get("id") ?? "";
  const tipoNota = query.get("tipoNota") ?? undefined;

  const result = await client.status(id, tipoNota || undefined);
  sendJson(res, 200, {
    success: result.ok,
    data: result.data,
    message: result.mensagem,
  });
};

/**
 * POST /api/certificado/registrar
 * Registra ou atualiza um certificado.
 */
export const registrarHandler: Handler = async (req, res) => {
  const client = new SiegCertificadoClient();

  const parsed = await parseMultipartRequest(req);
  if (!parsed) {
    sendJson(res, 400, {
      success: false,
      error: "Content-Type multipart/form-data com boundary é obrigatório.",
    });
    return;
  }

  const { parts } = parsed;
  const file = getMultipartFile(parts, "certificado", "arquivo", "pfx");
  const senha = getMultipartText(parts, "senha");
  const nome = getMultipartText(parts, "nome")?.trim() || undefined;
  const cnpj = getMultipartText(parts, "cnpj") || undefined;
  const uf = getMultipartText(parts, "uf") || undefined;

  if (!file?.data?.length) {
    sendJson(res, 400, {
      success: false,
      error: "Envie o arquivo do certificado (PFX).",
    });
    return;
  }

  if (!senha) {
    sendJson(res, 400, {
      success: false,
      error: "Campo 'senha' é obrigatório.",
    });
    return;
  }

  if (!nome) {
    sendJson(res, 400, {
      success: false,
      error: "Campo 'nome' (nome do certificado / razão social) é obrigatório.",
    });
    return;
  }

  const [ok, mensagem] = await client.cadastrarAtualizarCertificado(
    file.data,
    senha,
    cnpj,
    uf,
    nome
  );

  let message = mensagem;
  if (ok && cnpj) {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    const busca = await client.buscarPorCnpj(cnpjLimpo);
    if (busca.ok && busca.certificado) {
      message = `${mensagem} Certificado já visível na listagem (por CNPJ).`;
    } else {
      message = `${mensagem} Se não aparecer no painel SIEG, aguarde alguns minutos ou confira na listagem por CNPJ nesta aba.`;
    }
  }

  sendJson(res, 200, { success: ok, message });
};

/**
 * POST /api/certificado/editar
 * Edita um certificado existente.
 */
export const editarHandler: Handler = async (req, res) => {
  const client = new SiegCertificadoClient();

  const parsed = await parseMultipartRequest(req);
  if (!parsed) {
    sendJson(res, 400, {
      success: false,
      error: "Content-Type multipart/form-data com boundary é obrigatório.",
    });
    return;
  }

  const { parts } = parsed;
  const certificadoId = getMultipartText(parts, "certificadoId");
  const file = getMultipartFile(parts, "certificado", "arquivo", "pfx");
  const senha = getMultipartText(parts, "senha");
  const uf = getMultipartText(parts, "uf");

  if (!certificadoId) {
    sendJson(res, 400, {
      success: false,
      error: "Campo 'certificadoId' é obrigatório.",
    });
    return;
  }

  if (!file?.data?.length) {
    sendJson(res, 400, {
      success: false,
      error: "Envie o arquivo do certificado (PFX).",
    });
    return;
  }

  if (!senha) {
    sendJson(res, 400, {
      success: false,
      error: "Campo 'senha' é obrigatório.",
    });
    return;
  }

  // Normaliza UF para maiúsculas
  const ufNormalizada = uf ? uf.trim().toUpperCase() : "";

  // ConsultaSat só disponível para SP; ConsultaNfce só para RS (API SIEG)
  const consultaSat = ufNormalizada === "SP";
  const consultaNfce = ufNormalizada === "RS";

  // TipoConsultaNfse: "Nacional" não aceita ServicoPrestador/ServicoTomador
  const tipoConsultaNfse = "Nacional";

  const editBody: CertificadoRequestEdit = {
    CertificadoId: certificadoId,
    Certificado: file.data.toString("base64"),
    SenhaCertificado: senha,
    TipoCertificado: "Pfx",
    ConsultaSat: consultaSat,
    ConsultaNfe: true,
    ConsultaCte: true,
    ConsultaNfse: true,
    ConsultaNfce: consultaNfce,
    BaixarCancelados: true,
    ConsultaNoturna: true,
    ExcluirTransferenciaFiliais: false,
    TipoConsultaNfse: "Nacional",
    // ServicoPrestador e ServicoTomador não são enviados com NFSe Nacional
    ...(ufNormalizada ? { UfCertificado: ufNormalizada } : {}),
  };

  const [ok, mensagem] = await client.editarCertificado(editBody);
  sendJson(res, 200, { success: ok, message: mensagem });
};

/**
 * POST /api/certificado/habilitar
 * Habilita um certificado.
 */
export const habilitarHandler: Handler = async (req, res, query) => {
  const client = new SiegCertificadoClient();

  let id = query.get("id") ?? "";
  if (!id) {
    const body = (await readRequestJson(req).catch(() => ({}))) as {
      id?: string;
    };
    id = body?.id ?? "";
  }

  if (!id) {
    sendJson(res, 400, {
      success: false,
      error: "Parâmetro 'id' é obrigatório.",
    });
    return;
  }

  const [ok, mensagem] = await client.habilitar(id);
  sendJson(res, 200, { success: ok, message: mensagem });
};

/**
 * POST /api/certificado/desabilitar
 * Desabilita um certificado.
 */
export const desabilitarHandler: Handler = async (req, res, query) => {
  const client = new SiegCertificadoClient();

  let id = query.get("id") ?? "";
  if (!id) {
    const body = (await readRequestJson(req).catch(() => ({}))) as {
      id?: string;
    };
    id = body?.id ?? "";
  }

  if (!id) {
    sendJson(res, 400, {
      success: false,
      error: "Parâmetro 'id' é obrigatório.",
    });
    return;
  }

  const [ok, mensagem] = await client.desabilitar(id);
  sendJson(res, 200, { success: ok, message: mensagem });
};
