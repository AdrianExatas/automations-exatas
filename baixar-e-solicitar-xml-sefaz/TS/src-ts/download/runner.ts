import { join } from "node:path";
import { PATHS, SENHA_SEFAZ, UPLOAD_NUM_WORKERS, USUARIO_SEFAZ } from "../core/config.js";
import { SefazHttpClient, SefazHttpError } from "../sefaz-http/client.js";
import type { DownloadInfo, DownloadListingPage } from "../types.js";
import { acquireFileLock } from "../utils/lock.js";
import { arquivoJaOrganizado, extrairZipOrganizadoExistente } from "./files.js";
import { downloadState } from "./state.js";
import {
  carregarCheckpoint,
  registrarArquivoBaixado,
  salvarCheckpoint,
  salvarCursorCheckpoint,
} from "./checkpoint.js";

const CURSOR_SAVE_INTERVAL = 10;

function chaveDownload(info: DownloadInfo): string {
  const payload = {
    url: info.url,
    nome: info.nmArquivo,
    dt_solicitacao: info.dtSolicitacao ?? "",
    tipo_download: info.tipoDownload,
  };
  return JSON.stringify(payload, Object.keys(payload).sort());
}

function jaBaixado(info: DownloadInfo, arquivosBaixados: Set<string>): boolean {
  return (
    arquivosBaixados.has(info.url) ||
    Boolean(info.nmArquivo && arquivosBaixados.has(info.nmArquivo)) ||
    Boolean(info.dtSolicitacao && arquivosBaixados.has(info.dtSolicitacao))
  );
}

async function processarPaginaHttp(
  client: SefazHttpClient,
  paginaInfo: DownloadListingPage,
  arquivosBaixados: Set<string>,
  downloadsComErro: Set<string>,
  onDownload: (paginaCheckpoint: number) => void,
): Promise<[number, number]> {
  let novos = 0;
  let erros = 0;
  const paginaCheckpoint = paginaInfo.currentPage ?? 1;
  console.log(`\n[INFO] Processando pagina ${paginaCheckpoint}: ${paginaInfo.downloads.length} arquivo(s) pronto(s)`);

  for (const info of paginaInfo.downloads) {
    if (!downloadState.executando) {
      break;
    }
    if (downloadState.dataSolicitacao && !(info.dtSolicitacao ?? "").startsWith(downloadState.dataSolicitacao)) {
      continue;
    }
    if (jaBaixado(info, arquivosBaixados)) {
      console.log(`   [SKIP] ${info.nmArquivo || info.dtSolicitacao} - ja processado`);
      continue;
    }
    if (arquivoJaOrganizado(info)) {
      console.log(`   [SKIP] ${info.nmArquivo || info.dtSolicitacao} - ja existe em disco`);
      if (downloadState.extrairZips) {
        const extraido = extrairZipOrganizadoExistente(info);
        if (!extraido) {
          console.log(`   [AVISO] ${info.nmArquivo || info.dtSolicitacao} - ZIP existente nao pode ser extraido`);
        }
      }
      registrarArquivoBaixado(info, arquivosBaixados);
      continue;
    }

    const chaveErro = chaveDownload(info);
    if (downloadsComErro.has(chaveErro)) {
      console.log(`   [SKIP] ${info.nmArquivo || info.dtSolicitacao} - erro ja registrado nesta execucao`);
      continue;
    }

    console.log(`   [DOWNLOAD] ${info.nmArquivo || info.dtSolicitacao} [${info.tipoDownload}]`);
    try {
      await client.baixarArquivo(info, PATHS.downloadsDir);
      registrarArquivoBaixado(info, arquivosBaixados);
      onDownload(paginaCheckpoint);
      novos += 1;
    } catch (error) {
      erros += 1;
      downloadsComErro.add(chaveErro);
      console.log(`   [ERRO] ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return [novos, erros];
}

async function executarUploadAutomatico(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("INICIANDO UPLOAD AUTOMATICO PARA SIEG");
  console.log("=".repeat(60));
  const { enviarAutomatico } = await import("../upload/uploader.js");
  const resultado = await enviarAutomatico({
    pasta: PATHS.downloadsDir,
    excluirEnviados: true,
    numThreads: Math.max(1, Math.min(UPLOAD_NUM_WORKERS || 3, 10)),
  });
  if (resultado.erro) {
    console.log(`[AVISO] Upload automatico retornou erro: ${resultado.erro}`);
  }
}

export async function executarDownloadHttp(): Promise<void> {
  const lock = acquireFileLock(join(PATHS.lockDir, "download_http.lock"), "Ja existe um download HTTP em andamento");
  const checkpoint = carregarCheckpoint();
  const arquivosBaixados = checkpoint?.arquivos_baixados ?? new Set<string>();
  const downloadsComErro = new Set<string>();
  let totalBaixados = checkpoint?.total_baixados ?? 0;
  const paginaInicial = downloadState.paginaInicial ?? checkpoint?.pagina_atual ?? 1;
  const paginaFinal = downloadState.paginaFinal;
  let ultimaPaginaProcessada = paginaInicial - 1;
  let paginasDesdeCursor = 0;

  const salvarCursorAtual = () => {
    const paginaCheckpoint = Math.max(ultimaPaginaProcessada, paginaInicial);
    salvarCursorCheckpoint(paginaCheckpoint, totalBaixados, downloadState.dataSolicitacao);
  };

  const salvarEstadoCompleto = (paginaCheckpoint: number) => {
    salvarCheckpoint(paginaCheckpoint, arquivosBaixados, totalBaixados, downloadState.dataSolicitacao);
  };

  const registrarDownloadCompleto = (paginaCheckpoint: number) => {
    totalBaixados += 1;
    salvarEstadoCompleto(paginaCheckpoint);
  };

  const signalHandler = () => {
    console.log("\n[INFO] Sinal recebido. Salvando cursor e encerrando...");
    downloadState.executando = false;
    salvarCursorAtual();
  };

  process.once("SIGINT", signalHandler);
  process.once("SIGTERM", signalHandler);

  console.log("\n" + "=".repeat(60));
  console.log("INICIANDO DOWNLOAD DE ARQUIVOS VIA HTTP (TS/Bun)");
  console.log("=".repeat(60));
  if (checkpoint) {
    console.log(`[CHECKPOINT] Retomando da pagina ${paginaInicial} com ${totalBaixados} arquivo(s)`);
  }

  try {
    const client = new SefazHttpClient();
    await client.login(USUARIO_SEFAZ, SENHA_SEFAZ);

    let pagina = paginaInicial;
    while (true) {
      if (!downloadState.executando) {
        console.log("\n[INFO] Execucao interrompida pelo usuario");
        break;
      }
      if (paginaFinal && pagina > paginaFinal) {
        break;
      }

      console.log(`[INFO] Abrindo pagina ${pagina}...`);
      const paginaInfo = await client.listarDownloads(pagina, true);
      const [novos, erros] = await processarPaginaHttp(
        client,
        paginaInfo,
        arquivosBaixados,
        downloadsComErro,
        registrarDownloadCompleto,
      );

      ultimaPaginaProcessada = paginaInfo.currentPage ?? pagina;
      paginasDesdeCursor += 1;
      if (paginasDesdeCursor >= CURSOR_SAVE_INTERVAL) {
        salvarCursorAtual();
        paginasDesdeCursor = 0;
      }
      console.log(`[PAGINA ${ultimaPaginaProcessada}] +${novos} download(s), ${erros} erro(s)`);

      const proxima = ultimaPaginaProcessada + 1;
      if (paginaFinal && proxima > paginaFinal) {
        break;
      }
      if (!(proxima in paginaInfo.pageLinks) && !paginaInfo.nextPageUrl) {
        break;
      }
      pagina = proxima;
    }
  } finally {
    salvarCursorAtual();
    process.removeListener("SIGINT", signalHandler);
    process.removeListener("SIGTERM", signalHandler);
    lock.release();
  }

  console.log("\n" + "=".repeat(60));
  console.log("RESUMO DO DOWNLOAD");
  console.log("=".repeat(60));
  console.log(`[OK] Total de arquivos baixados: ${totalBaixados}`);
  console.log(`[INFO] Diretorio de destino: ${PATHS.downloadsDir}`);
  console.log("=".repeat(60));

  if (downloadState.uploadAutomatico) {
    await executarUploadAutomatico();
  }
}

export async function executarDownload(options: { selenium?: boolean } = {}): Promise<void> {
  if (options.selenium) {
    throw new SefazHttpError("Fluxo Selenium legado nao foi portado para TS; use o fluxo HTTP ou mantenha o Python para esse fallback.");
  }
  await executarDownloadHttp();
}
