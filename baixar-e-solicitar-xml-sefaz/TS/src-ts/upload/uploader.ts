import pLimit from "p-limit";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { PATHS, SIEG_API_KEY } from "../core/config.js";
import type { UploadResult } from "../types.js";
import { sleep } from "../utils/retry.js";
import { enviarXml } from "./sieg-api.js";
import { extrairChaveAcesso, identificarTipoXml, obterTipoCompletoNota, validarXmlDetalhado } from "./utils.js";

interface XmlInfo {
  caminho: string;
  nome: string;
  conteudo: string;
  chave?: string;
  tipo?: string;
}

const WARM_UP_FASE1_QTD = 5;
const WARM_UP_FASE1_THREADS = 1;
const WARM_UP_FASE2_QTD = 15;
const WARM_UP_FASE2_THREADS = 5;
const WARM_UP_FASE3_QTD = 30;
const WARM_UP_FASE3_THREADS = 10;
const WARM_UP_DELAY_MS = 200;
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
  for (const caminho of paths) {
    try {
      const conteudo = readFileSync(caminho, "utf8");
      const validacao = validarXmlDetalhado(conteudo);
      if (!validacao.valido) {
        xmlsInvalidos.push({ caminho, erro: validacao.erro });
        continue;
      }
      xmlsValidos.push({
        caminho,
        nome: basename(caminho),
        conteudo,
        chave: extrairChaveAcesso(conteudo),
        tipo: identificarTipoXml(conteudo),
      });
    } catch (error) {
      xmlsInvalidos.push({ caminho, erro: error instanceof Error ? error.message : String(error) });
      // ignora arquivos ilegíveis, mantendo o comportamento tolerante do Python
    }
  }
  return { validos: xmlsValidos, invalidos: xmlsInvalidos };
}

async function enviarLote(
  xmls: XmlInfo[],
  threads: number,
  faseInfo: string,
  state: {
    apiKey: string;
    total: number;
    processados: number;
    enviadosSucesso: XmlInfo[];
    errosEnvio: Array<{ xml: XmlInfo; erro: string }>;
    errosRecuperaveis: XmlInfo[];
  },
): Promise<void> {
  const limit = pLimit(Math.max(1, threads));

  await Promise.all(
    xmls.map((xmlInfo) =>
      limit(async () => {
        const [sucesso, msg, recuperavel] = await enviarXml(xmlInfo.conteudo, state.apiKey, undefined, true);
        state.processados += 1;

        const chave = xmlInfo.chave && xmlInfo.chave.length === 44 ? `N_${xmlInfo.chave}` : `${xmlInfo.nome.slice(0, 45)}...`;
        const tipoCompleto = obterTipoCompletoNota(xmlInfo.conteudo);
        const tipoInfo = tipoCompleto && tipoCompleto !== "Desconhecido" ? ` (${tipoCompleto})` : "";

        if (sucesso) {
          console.log(`[${state.processados}/${state.total}] [OK]${faseInfo} - ${chave}${tipoInfo}`);
          state.enviadosSucesso.push(xmlInfo);
        } else {
          console.log(`[${state.processados}/${state.total}] [ERRO]${faseInfo} - ${chave}${tipoInfo}`);
          console.log(`         ${msg}`);
          if (recuperavel) {
            state.errosRecuperaveis.push(xmlInfo);
          } else {
            state.errosEnvio.push({ xml: xmlInfo, erro: msg });
          }
        }
      }),
    ),
  );
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

  const state = {
    apiKey,
    total: xmlsValidos.length,
    processados: 0,
    enviadosSucesso: [] as XmlInfo[],
    errosEnvio: [] as Array<{ xml: XmlInfo; erro: string }>,
    errosRecuperaveis: [] as XmlInfo[],
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
    console.log(`\n-- Retentando ${retryList.length} XMLs com erro recuperavel --`);
    await sleep(2000);
    await enviarLote(retryList, 1, " [RETRY]", state);
    for (const xml of state.errosRecuperaveis) {
      state.errosEnvio.push({ xml, erro: "Erro recuperavel apos retry" });
    }
  }

  if (excluirEnviados && state.enviadosSucesso.length) {
    console.log(`\nExcluindo ${state.enviadosSucesso.length} XMLs enviados com sucesso...`);
    let excluidos = 0;
    for (const xml of state.enviadosSucesso) {
      try {
        rmSync(xml.caminho, { force: true });
        excluidos += 1;
      } catch {
        // noop
      }
    }
    console.log(`   [OK] ${excluidos} arquivo(s) excluido(s)`);
  }

  const tempoTotal = (Date.now() - inicioTempo) / 1000;
  console.log("\n" + "=".repeat(60));
  console.log("RESUMO FINAL DO UPLOAD");
  console.log("=".repeat(60));
  console.log(`   Total de XMLs encontrados: ${xmlsValidos.length}`);
  console.log("   Ja existentes no SIEG: 0 (verificacao previa desativada)");
  console.log(`   Enviados com sucesso: ${state.enviadosSucesso.length}`);
  console.log(`   Erros: ${state.errosEnvio.length}`);
  console.log(`   Tempo total: ${tempoTotal.toFixed(2)} segundos`);
  console.log("=".repeat(60));

  return {
    total: xmlsValidos.length,
    enviados: state.enviadosSucesso.length,
    existentes: 0,
    erros: state.errosEnvio.length,
  };
}
