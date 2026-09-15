import pLimit from "p-limit";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { PATHS, SIEG_API_KEY } from "../core/config.js";
import type { UploadResult } from "../types.js";
import { sleep } from "../utils/retry.js";
import { enviarXml, verificarEventoExisteComRetry, verificarXmlExisteComRetry } from "./sieg-api.js";
import {
  classificarXmlSieg,
  extrairChaveAcesso,
  extrairTipoEvento,
  identificarTipoXml,
  obterTipoCompletoNota,
  obterXmlTypeSieg,
  type XmlCategoriaSieg,
  validarXmlDetalhado,
} from "./utils.js";

interface XmlInfo {
  caminho: string;
  nome: string;
  conteudo: string;
  chave?: string;
  tipo?: string;
  categoria: XmlCategoriaSieg;
  tipoEvento?: number;
  xmlTypeSieg: number;
}

interface UploadState {
  apiKey: string;
  total: number;
  iniciados: number;
  concluidos: number;
  retryIniciados: number;
  retryTotal: number;
  excluirEnviados: boolean;
  excluidos: number;
  enviadosSucesso: XmlInfo[];
  errosEnvio: Array<{ xml: XmlInfo; erro: string }>;
  errosRecuperaveis: XmlInfo[];
  errosExclusao: Array<{ xml: XmlInfo; erro: string }>;
  confirmadosSieg: XmlInfo[];
  eventosConfirmadosSieg: XmlInfo[];
  semValidacaoFinalSieg: XmlInfo[];
  naoConfirmadosSieg: XmlInfo[];
}

const WARM_UP_FASE1_QTD = 5;
const WARM_UP_FASE1_THREADS = 1;
const WARM_UP_FASE2_QTD = 15;
const WARM_UP_FASE2_THREADS = 5;
const WARM_UP_FASE3_QTD = 30;
const WARM_UP_FASE3_THREADS = 10;
const WARM_UP_DELAY_MS = 200;
const VERIFICACAO_FINAL_THREADS = 5;
export const NUM_THREADS_PADRAO = 20;

function listarXmlsRecursivo(pasta: string): string[] {
  const result: string[] = [];
  if (!existsSync(pasta)) {
    return result;
  }
  for (const item of readdirSync(pasta)) {
    const path = join(pasta, item);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      result.push(...listarXmlsRecursivo(path));
    } else if (stats.isFile() && item.toLowerCase().endsWith(".xml")) {
      result.push(path);
    }
  }
  return result;
}

function carregarXmlsValidos(paths: string[]): { validos: XmlInfo[]; invalidos: Array<{ caminho: string; erro: string }> } {
  const xmlsValidos: XmlInfo[] = [];
  const xmlsInvalidos: Array<{ caminho: string; erro: string }> = [];
  paths.forEach((caminho, index) => {
    console.log(`[VALIDANDO ${index + 1}/${paths.length}] ${basename(caminho)}`);
    try {
      const conteudo = readFileSync(caminho, "utf8");
      const validacao = validarXmlDetalhado(conteudo);
      if (!validacao.valido) {
        xmlsInvalidos.push({ caminho, erro: validacao.erro });
        return;
      }
      const chave = extrairChaveAcesso(conteudo);
      xmlsValidos.push({
        caminho,
        nome: basename(caminho),
        conteudo,
        chave,
        tipo: identificarTipoXml(conteudo),
        categoria: classificarXmlSieg(conteudo),
        tipoEvento: extrairTipoEvento(conteudo),
        xmlTypeSieg: obterXmlTypeSieg(conteudo),
      });
    } catch (error) {
      xmlsInvalidos.push({ caminho, erro: error instanceof Error ? error.message : String(error) });
      // Mantem o comportamento tolerante para arquivos ilegiveis.
    }
  });
  return { validos: xmlsValidos, invalidos: xmlsInvalidos };
}

function formatarIdentificacaoXml(xmlInfo: XmlInfo): string {
  const prefixo = xmlInfo.tipo === "CTe" ? "C" : "N";
  const chave = xmlInfo.chave && xmlInfo.chave.length === 44 ? `${prefixo}_${xmlInfo.chave}` : `${xmlInfo.nome.slice(0, 45)}...`;
  const tipoCompleto = obterTipoCompletoNota(xmlInfo.conteudo);
  const tipoInfo = tipoCompleto && tipoCompleto !== "Desconhecido" ? ` (${tipoCompleto})` : "";
  return `${chave}${tipoInfo}`;
}

function excluirXmlEnviado(xmlInfo: XmlInfo, state: UploadState): void {
  if (!state.excluirEnviados) {
    return;
  }

  try {
    rmSync(xmlInfo.caminho, { force: true });
    state.excluidos += 1;
    console.log(`         [EXCLUIDO] ${xmlInfo.nome}`);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    state.errosExclusao.push({ xml: xmlInfo, erro: mensagem });
    console.log(`         [AVISO] Falha ao excluir ${xmlInfo.nome}: ${mensagem}`);
  }
}

async function enviarLote(
  xmls: XmlInfo[],
  threads: number,
  faseInfo: string,
  state: UploadState,
  options: { retry?: boolean } = {},
): Promise<void> {
  const limit = pLimit(Math.max(1, threads));
  const isRetry = options.retry ?? false;

  await Promise.all(
    xmls.map((xmlInfo) =>
      limit(async () => {
        const identificacao = formatarIdentificacaoXml(xmlInfo);
        if (isRetry) {
          state.retryIniciados += 1;
          console.log(`[ENVIANDO RETRY ${state.retryIniciados}/${state.retryTotal}]${faseInfo} - ${identificacao}`);
        } else {
          state.iniciados += 1;
          console.log(`[ENVIANDO ${state.iniciados}/${state.total}]${faseInfo} - ${identificacao}`);
        }

        const [sucesso, msg, recuperavel] = await enviarXml(xmlInfo.conteudo, state.apiKey, undefined, true);

        if (sucesso) {
          state.concluidos += 1;
          console.log(`[OK ${state.concluidos}/${state.total}]${faseInfo} - ${identificacao}`);
          state.enviadosSucesso.push(xmlInfo);
          return;
        }

        if (recuperavel && !isRetry) {
          console.log(`[RETRY ${state.concluidos}/${state.total}]${faseInfo} - ${identificacao}`);
          console.log(`         ${msg}`);
          state.errosRecuperaveis.push(xmlInfo);
          return;
        }

        state.concluidos += 1;
        console.log(`[ERRO ${state.concluidos}/${state.total}]${faseInfo} - ${identificacao}`);
        console.log(`         ${msg}`);
        state.errosEnvio.push({ xml: xmlInfo, erro: msg });
      }),
    ),
  );
}

async function validarEnviadosNoSieg(state: UploadState): Promise<void> {
  if (!state.enviadosSucesso.length) {
    return;
  }

  console.log("\n" + "=".repeat(60));
  console.log("Validando XMLs enviados no SIEG...");
  console.log("=".repeat(60));

  const limit = pLimit(VERIFICACAO_FINAL_THREADS);
  let iniciados = 0;

  await Promise.all(
    state.enviadosSucesso.map((xmlInfo) =>
      limit(async () => {
        const indice = ++iniciados;
        const identificacao = formatarIdentificacaoXml(xmlInfo);
        console.log(`[VALIDANDO SIEG ${indice}/${state.enviadosSucesso.length}] ${identificacao}`);

        if (xmlInfo.categoria === "inutilizacao") {
          registrarSemValidacaoFinal(xmlInfo, state, "Inutilizacao aceita no upload; sem endpoint publico de validacao final");
          return;
        }

        if (!xmlInfo.chave || xmlInfo.chave.length !== 44) {
          registrarSemValidacaoFinal(xmlInfo, state, "XML aceito no upload, mas sem chave de acesso para validacao final");
          return;
        }

        const xmlTypeSieg = xmlInfo.xmlTypeSieg;
        if (obterTipoCompletoNota(xmlInfo.conteudo) === "Desconhecido") {
          console.log("         [AVISO] Tipo de XML nao identificado; validando no SIEG como NF-e (xmlType=1)");
        }

        if (xmlInfo.categoria === "evento") {
          if (!xmlInfo.tipoEvento || !Number.isFinite(xmlInfo.tipoEvento)) {
            registrarSemValidacaoFinal(xmlInfo, state, "Evento aceito no upload, mas sem tpEvento para validacao final");
            return;
          }

          const eventoConfirmado = await verificarEventoExisteComRetry(
            xmlInfo.chave,
            xmlInfo.tipoEvento,
            state.apiKey,
            undefined,
            undefined,
            xmlTypeSieg,
          );
          if (eventoConfirmado) {
            state.eventosConfirmadosSieg.push(xmlInfo);
            console.log("         [SIEG OK] Evento confirmado no SIEG");
            excluirXmlEnviado(xmlInfo, state);
          } else {
            state.naoConfirmadosSieg.push(xmlInfo);
            console.log("         [AVISO] Evento enviado, mas ainda nao foi confirmado no SIEG na validacao final");
          }
          return;
        }

        const confirmado = await verificarXmlExisteComRetry(xmlInfo.chave, state.apiKey, undefined, undefined, xmlTypeSieg);
        if (confirmado) {
          state.confirmadosSieg.push(xmlInfo);
          console.log("         [SIEG OK] XML confirmado no SIEG");
          excluirXmlEnviado(xmlInfo, state);
        } else {
          state.naoConfirmadosSieg.push(xmlInfo);
          console.log("         [AVISO] XML enviado, mas ainda nao foi confirmado no SIEG na validacao final");
        }
      }),
    ),
  );
}

function registrarSemValidacaoFinal(xmlInfo: XmlInfo, state: UploadState, mensagem: string): void {
  state.semValidacaoFinalSieg.push(xmlInfo);
  console.log(`         [SIEG SEM VALIDACAO FINAL] ${mensagem}`);
  excluirXmlEnviado(xmlInfo, state);
}

export async function enviarAutomatico(options: {
  pasta?: string;
  excluirEnviados?: boolean;
  numThreads?: number;
} = {}): Promise<UploadResult> {
  const pasta = options.pasta ?? PATHS.downloadsDir;
  const excluirEnviados = options.excluirEnviados ?? true;
  const numThreads = options.numThreads ?? NUM_THREADS_PADRAO;

  console.log("=".repeat(60));
  console.log("MODO AUTOMATICO - Envio de XMLs para SIEG (TS/Bun)");
  console.log("=".repeat(60));
  console.log(`\nPasta: ${pasta}`);
  console.log(`Threads max: ${numThreads}`);
  console.log(`Excluir apos envio: ${excluirEnviados ? "Sim" : "Nao"}\n`);

  if (!existsSync(pasta)) {
    console.log(`\nERRO: Pasta nao encontrada: ${pasta}`);
    return { erro: "Pasta nao encontrada", total: 0, enviados: 0, existentes: 0, erros: 0 };
  }

  const apiKey = SIEG_API_KEY;
  if (!apiKey) {
    console.log("\nERRO: API Key nao configurada no .env");
    return { erro: "API Key nao configurada", total: 0, enviados: 0, existentes: 0, erros: 0 };
  }

  console.log("\n" + "=".repeat(60));
  console.log("Buscando arquivos XML...");
  console.log("=".repeat(60));
  const xmlsEncontrados = listarXmlsRecursivo(pasta);
  if (!xmlsEncontrados.length) {
    console.log("[INFO] Nenhum arquivo XML encontrado na pasta.");
    return { total: 0, enviados: 0, existentes: 0, erros: 0 };
  }
  console.log(`Encontrados: ${xmlsEncontrados.length} arquivo(s) XML`);

  console.log("\n" + "=".repeat(60));
  console.log("Lendo e validando XMLs...");
  console.log("=".repeat(60));
  const { validos: xmlsValidos, invalidos: xmlsInvalidos } = carregarXmlsValidos(xmlsEncontrados);
  console.log(`XMLs validos: ${xmlsValidos.length}`);
  if (xmlsInvalidos.length) {
    console.log(`XMLs invalidos/ilegiveis: ${xmlsInvalidos.length}`);
    for (const invalido of xmlsInvalidos.slice(0, 5)) {
      console.log(`   [INVALIDO] ${basename(invalido.caminho)} - ${invalido.erro}`);
    }
    if (xmlsInvalidos.length > 5) {
      console.log(`   ... ${xmlsInvalidos.length - 5} outro(s) XML(s) invalido(s) omitido(s)`);
    }
  }
  if (!xmlsValidos.length) {
    return { total: 0, enviados: 0, existentes: 0, erros: 0 };
  }

  console.log("\n" + "=".repeat(60));
  console.log("Preparando XMLs para envio direto ao SIEG...");
  console.log("=".repeat(60));
  console.log("Consulta previa de existencia desativada; todos os XMLs validos serao enviados.");

  const state: UploadState = {
    apiKey,
    total: xmlsValidos.length,
    iniciados: 0,
    concluidos: 0,
    retryIniciados: 0,
    retryTotal: 0,
    excluirEnviados,
    excluidos: 0,
    enviadosSucesso: [],
    errosEnvio: [],
    errosRecuperaveis: [],
    errosExclusao: [],
    confirmadosSieg: [],
    eventosConfirmadosSieg: [],
    semValidacaoFinalSieg: [],
    naoConfirmadosSieg: [],
  };
  const inicioTempo = Date.now();

  const fase1 = xmlsValidos.slice(0, WARM_UP_FASE1_QTD);
  if (fase1.length) {
    console.log(`\n-- Fase 1: Enviando ${fase1.length} XMLs sequencialmente --`);
    for (const xml of fase1) {
      await enviarLote([xml], WARM_UP_FASE1_THREADS, " [F1]", state);
      await sleep(WARM_UP_DELAY_MS);
    }
  }

  let restantes = xmlsValidos.slice(fase1.length);
  const fase2 = restantes.slice(0, WARM_UP_FASE2_QTD);
  if (fase2.length) {
    console.log(`\n-- Fase 2: Enviando ${fase2.length} XMLs com ${WARM_UP_FASE2_THREADS} threads --`);
    await enviarLote(fase2, WARM_UP_FASE2_THREADS, " [F2]", state);
  }

  restantes = restantes.slice(fase2.length);
  const fase3 = restantes.slice(0, WARM_UP_FASE3_QTD);
  if (fase3.length) {
    console.log(`\n-- Fase 3: Enviando ${fase3.length} XMLs com ${WARM_UP_FASE3_THREADS} threads --`);
    await enviarLote(fase3, WARM_UP_FASE3_THREADS, " [F3]", state);
  }

  restantes = restantes.slice(fase3.length);
  if (restantes.length) {
    console.log(`\n-- Fase 4: Enviando ${restantes.length} XMLs com ${numThreads} threads --`);
    await enviarLote(restantes, numThreads, "", state);
  }

  if (state.errosRecuperaveis.length) {
    const retryList = [...state.errosRecuperaveis];
    state.errosRecuperaveis.length = 0;
    state.retryIniciados = 0;
    state.retryTotal = retryList.length;
    console.log(`\n-- Retentando ${retryList.length} XMLs com erro recuperavel --`);
    await sleep(2000);
    await enviarLote(retryList, 1, " [RETRY]", state, { retry: true });
  }

  await validarEnviadosNoSieg(state);

  const tempoTotal = (Date.now() - inicioTempo) / 1000;
  console.log("\n" + "=".repeat(60));
  console.log("RESUMO FINAL DO UPLOAD");
  console.log("=".repeat(60));
  console.log(`   Total de XMLs encontrados: ${xmlsValidos.length}`);
  console.log("   Ja existentes no SIEG: 0 (verificacao previa desativada)");
  console.log(`   Enviados com sucesso: ${state.enviadosSucesso.length}`);
  console.log(`   Confirmados no SIEG: ${state.confirmadosSieg.length}`);
  console.log(`   Eventos confirmados no SIEG: ${state.eventosConfirmadosSieg.length}`);
  console.log(`   Sem validacao final no SIEG: ${state.semValidacaoFinalSieg.length}`);
  console.log(`   Nao confirmados no SIEG: ${state.naoConfirmadosSieg.length}`);
  console.log(`   Erros: ${state.errosEnvio.length}`);
  console.log(`   XMLs excluidos: ${state.excluidos}`);
  console.log(`   Falhas ao excluir: ${state.errosExclusao.length}`);
  console.log(`   Tempo total: ${tempoTotal.toFixed(2)} segundos`);
  console.log("=".repeat(60));

  return {
    total: xmlsValidos.length,
    enviados: state.enviadosSucesso.length,
    existentes: 0,
    erros: state.errosEnvio.length,
    confirmadosSieg: state.confirmadosSieg.length,
    eventosConfirmadosSieg: state.eventosConfirmadosSieg.length,
    semValidacaoFinalSieg: state.semValidacaoFinalSieg.length,
    naoConfirmadosSieg: state.naoConfirmadosSieg.length,
  };
}
