import path from "node:path";

import type { SendServiceRequestsProgressEvent } from "@exatas/onvio-solicitacoes-servico";
import { loadEnvConfig } from "../config";
import { loadEmpresasFromExcel } from "../input";
import { resolveRuntimePath } from "../project-paths";
import type { EmpresaBatchItem } from "../types";
import { refreshUdsLongTokenForUpload } from "../onvio-uds-refresh";
import { generateUploadRunId, writeUploadExecutionReport } from "../upload-execution-report";
import { uploadOnvioBatch } from "../upload-onvio-batch";
import {
  findLatestNormalizedDir,
  loadDotenvFromProjectRoot,
  resolveExcelPath,
} from "./cli-helpers";
import { normalizeCode } from "./upload-onvio-helpers";

interface UploadCliFlags {
  skipAttachments: boolean;
  dryRun: boolean;
  limite?: number;
  codigos?: string[];
}

function parseUploadLimite(argv: string[]): number | undefined {
  const idx = argv.indexOf("--limite");
  if (idx >= 0) {
    const raw = argv[idx + 1];
    if (raw && !raw.startsWith("--")) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return Number.NaN;
  }
  const prefixed = argv.find((a) => a.startsWith("--limite="));
  if (prefixed) {
    const n = Number.parseInt(prefixed.slice("--limite=".length), 10);
    if (Number.isFinite(n) && n > 0) return n;
    return Number.NaN;
  }
  return undefined;
}

function parseUploadCodigos(argv: string[]): string[] | undefined {
  const idx = argv.indexOf("--codigos");
  if (idx >= 0) {
    const raw = argv[idx + 1];
    if (!raw || raw.startsWith("--")) {
      return undefined;
    }
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }
  const prefixed = argv.find((a) => a.startsWith("--codigos="));
  if (prefixed) {
    const parts = prefixed
      .slice("--codigos=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }
  return undefined;
}

function parseUploadCliArgs(argv: string[]): UploadCliFlags {
  const limiteRaw = parseUploadLimite(argv);
  return {
    skipAttachments: argv.includes("--sem-anexos"),
    dryRun: argv.includes("--dry-run"),
    limite: Number.isNaN(limiteRaw as number) ? undefined : limiteRaw,
    codigos: parseUploadCodigos(argv),
  };
}

function formatEmpresaLabel(empresa: {
  codigo: string;
  nome: string;
  cnpj: string;
}): string {
  return [empresa.codigo, empresa.nome || empresa.cnpj].filter(Boolean).join(" - ");
}

function logUploadOnvioProgress(evt: SendServiceRequestsProgressEvent): void {
  switch (evt.type) {
    case "batch_start":
      console.log(`[Onvio] Lote: ${evt.total} solicitacao(oes) a processar.`);
      break;
    case "item_start":
      console.log(`[Onvio] [${evt.index}/${evt.total}] ${formatEmpresaLabel(evt.row)}`);
      break;
    case "item_done": {
      const label = formatEmpresaLabel(evt.row);
      if (evt.outcome === "success") {
        const ticket = evt.ticketId ? ` Ticket: ${evt.ticketId}.` : "";
        console.log(`[Onvio] [${evt.index}/${evt.total}] OK — ${label}.${ticket}`);
      } else if (evt.outcome === "skipped") {
        console.log(`[Onvio] [${evt.index}/${evt.total}] Pulado — ${label}: ${evt.message ?? ""}`);
      } else {
        console.warn(
          `[Onvio] [${evt.index}/${evt.total}] ERRO — ${label}: ${evt.message ?? "Falha sem mensagem."}`,
        );
      }
      break;
    }
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const cliFlags = parseUploadCliArgs(argv);
  const excelPath = resolveExcelPath(env.empresasExcelPath);
  const skipAttachments = cliFlags.skipAttachments || env.onvioSkipAttachments;
  const dryRun = cliFlags.dryRun || env.onvioDryRun;

  if (!excelPath) {
    console.error(
      `Planilha principal nao encontrada. Verifique EMPRESAS_EXCEL_PATH (${env.empresasExcelPath}).`,
    );
    return 1;
  }

  const limiteFlagPresent = argv.includes("--limite") || argv.some((a) => a.startsWith("--limite="));
  if (limiteFlagPresent && cliFlags.limite === undefined) {
    console.error("Uso: --limite N (N inteiro positivo), ex.: --limite 3");
    return 1;
  }

  const codigosFlagPresent = argv.includes("--codigos") || argv.some((a) => a.startsWith("--codigos="));
  if (codigosFlagPresent && (!cliFlags.codigos || cliFlags.codigos.length === 0)) {
    console.error("Uso: --codigos 107,108,120 (CODIGOs separados por virgula, na ordem do envio)");
    return 1;
  }

  if (cliFlags.codigos && cliFlags.codigos.length > 0 && cliFlags.limite != null) {
    console.error("Use apenas uma opcao: --limite ou --codigos, nao ambas.");
    return 1;
  }

  let batchInput: { excelPath: string } | { empresas: EmpresaBatchItem[] };
  if (cliFlags.codigos && cliFlags.codigos.length > 0) {
    const todas = loadEmpresasFromExcel(excelPath);
    const byCode = new Map<string, EmpresaBatchItem>();
    for (const row of todas) {
      byCode.set(normalizeCode(row.codigo), row);
    }
    const empresas: EmpresaBatchItem[] = [];
    for (const c of cliFlags.codigos) {
      const key = normalizeCode(c);
      const row = byCode.get(key);
      if (!row) {
        console.error(`Codigo "${c}" nao encontrado na planilha (${excelPath}).`);
        return 1;
      }
      empresas.push(row);
    }
    console.log(`Upload por codigo(s): ${cliFlags.codigos.join(", ")} (${empresas.length} linha(s)).`);
    batchInput = { empresas };
  } else if (cliFlags.limite != null) {
    const todas = loadEmpresasFromExcel(excelPath);
    const empresas = todas.slice(0, cliFlags.limite);
    if (empresas.length === 0) {
      console.error("Planilha sem linhas para upload.");
      return 1;
    }
    console.log(
      `Upload parcial: ${empresas.length} cliente(s) de ${todas.length} na planilha (limite=${cliFlags.limite}).`,
    );
    batchInput = { empresas };
  } else {
    batchInput = { excelPath };
  }

  const attachmentsDir: string | undefined = skipAttachments
    ? undefined
    : env.unecontUploadDir || findLatestNormalizedDir() || undefined;
  if (!skipAttachments && !attachmentsDir) {
    console.error(
      "Nenhum diretorio normalizado encontrado. Configure UNECONT_UPLOAD_DIR ou execute a normalizacao antes do upload.",
    );
    return 1;
  }

  const nfsVideoTrimmed = env.unecontOnvioNfsVideoPath.trim();
  const extraAttachmentPaths =
    !skipAttachments && nfsVideoTrimmed ? [path.resolve(nfsVideoTrimmed)] : undefined;

  const canOnvioAutoRefresh =
    !dryRun &&
    env.onvioAutoRefreshToken &&
    env.onvioEmail.trim() !== "" &&
    env.onvioPassword.trim() !== "";
  if (env.onvioAutoRefreshToken && !dryRun && !canOnvioAutoRefresh) {
    console.warn(
      "[Onvio] ONVIO_AUTO_REFRESH_TOKEN ativo mas faltam ONVIO_EMAIL ou ONVIO_PASSWORD; renovacao automatica desabilitada.",
    );
  }

  const onUnauthorized = canOnvioAutoRefresh
    ? async () => {
        console.warn(
          "[Onvio] Resposta 401 da API. Renovando UDSLongToken via shared/onvio-auth (Playwright; pode abrir o navegador)...",
        );
        return refreshUdsLongTokenForUpload();
      }
    : undefined;

  let tokenForBatch = env.onvioUdsToken.trim();
  if (canOnvioAutoRefresh && !tokenForBatch) {
    console.warn(
      "[Onvio] ONVIO_UDS_TOKEN vazio; obtendo UDSLongToken via shared/onvio-auth (Playwright; pode abrir o navegador)...",
    );
    try {
      tokenForBatch = await refreshUdsLongTokenForUpload();
    } catch (error) {
      console.error(
        "Erro na execucao:",
        error instanceof Error ? error.message : String(error),
      );
      return 1;
    }
  }

  if (!dryRun && !tokenForBatch) {
    console.error(
      "Token do Onvio nao informado. Defina ONVIO_UDS_TOKEN ou ative ONVIO_AUTO_REFRESH_TOKEN com ONVIO_EMAIL e ONVIO_PASSWORD preenchidos.",
    );
    return 1;
  }

  try {
    const result = await uploadOnvioBatch({
      token: tokenForBatch,
      input: batchInput,
      attachmentsDir,
      attachmentsMode: skipAttachments ? "none" : "required",
      dryRun,
      bdApiBaseUrl: env.bdApiBaseUrl,
      extraAttachmentPaths,
      onUnauthorized,
      onProgress: logUploadOnvioProgress,
      defaults: {
        clientId: env.onvioClientId || undefined,
        requesterId: env.onvioRequesterId || undefined,
        departmentId: env.onvioDepartmentId || undefined,
        departmentName: env.onvioDepartmentName || undefined,
      },
    });

    const uploadRunIdForFolder = attachmentsDir ? null : generateUploadRunId();
    const reportBaseDir = attachmentsDir
      ? path.resolve(attachmentsDir)
      : resolveRuntimePath("uploads", uploadRunIdForFolder!);
    const runIdForReport = attachmentsDir
      ? path.basename(path.resolve(attachmentsDir))
      : uploadRunIdForFolder!;

    try {
      const reportPath = writeUploadExecutionReport({
        result,
        runId: runIdForReport,
        reportBaseDir,
        attachmentsDir: attachmentsDir ? path.resolve(attachmentsDir) : "",
        empresasExcelPath: excelPath,
        dryRun,
        skipAttachments,
      });
      console.log(`Relatorio upload: ${reportPath}`);
    } catch (error) {
      console.warn(
        `Falha ao gerar relatorio de upload: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    for (const warning of result.warnings) {
      console.warn(`[AVISO] ${warning}`);
    }

    if (dryRun) {
      for (const item of result.items) {
        const empresaLabel = formatEmpresaLabel(item.empresa);
        const prefix = item.status === "failed" ? "[ERRO]" : "[PREVIEW]";
        const detail = item.message ?? "Pre-validacao concluida.";
        console.log(`${prefix} ${empresaLabel}: ${detail}`);

        for (const warning of item.warnings ?? []) {
          console.warn(`[AVISO] ${empresaLabel}: ${warning}`);
        }
      }
    } else if (result.summary.failed > 0) {
      for (const item of result.items) {
        if (item.status !== "failed") continue;
        const empresaLabel = formatEmpresaLabel(item.empresa);
        console.error(`[ERRO] ${empresaLabel}: ${item.message ?? "Falha sem mensagem."}`);
        for (const warning of item.warnings ?? []) {
          console.warn(`[AVISO] ${empresaLabel}: ${warning}`);
        }
      }
    }

    console.log(
      `Resumo: ${result.summary.success} enviadas, ${result.summary.failed} falhas, ${result.summary.skipped} puladas.`,
    );

    return result.summary.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error("Erro na execucao:", error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error("Erro inesperado:", error);
      process.exit(1);
    });
}
