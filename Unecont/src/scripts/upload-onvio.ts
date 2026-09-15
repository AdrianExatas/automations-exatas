import path from "node:path";

import type { SendServiceRequestsProgressEvent } from "@exatas/onvio-solicitacoes-servico";
import { createClientUsersRequesterResolver } from "../client-users-requester-resolver";
import { loadEnvConfig } from "../config";
import { loadEmpresasFromExcel } from "../input";
import { OnvioHttpClientUsersProvider } from "../onvio-http-client-users-provider";
import {
  createOnvioDepartmentsIdentifierProvider,
  OnvioHttpDepartmentsProvider,
} from "../onvio-http-departments-provider";
import { resolveRuntimePath } from "../project-paths";
import type { EmpresaBatchItem } from "../types";
import { readCachedUdsLongTokenForUpload, refreshUdsLongTokenForUpload } from "../onvio-uds-refresh";
import { generateUploadRunId, writeUploadExecutionReport } from "../upload-execution-report";
import { UploadCheckpoint } from "../upload-checkpoint";
import { uploadOnvioBatch } from "../upload-onvio-batch";
import {
  findLatestNormalizedDir,
  loadDotenvFromProjectRoot,
  resolveExcelPath,
} from "./cli-helpers";
import { normalizeCode } from "./upload-onvio-helpers";
import { assertNoAttachmentIdentityMismatches } from "../attachment-identity-gate";

interface UploadCliFlags {
  skipAttachments: boolean;
  dryRun: boolean;
  limite?: number;
  codigos?: string[];
  aPartirDe?: string;
  checkpoint: boolean;
  checkpointPath?: string;
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

function parseValueArg(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0) {
    const raw = argv[idx + 1];
    return raw && !raw.startsWith("--") ? raw.trim() : undefined;
  }

  const prefixed = argv.find((a) => a.startsWith(`${flag}=`));
  if (prefixed) {
    const raw = prefixed.slice(flag.length + 1).trim();
    return raw || undefined;
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
    aPartirDe: parseValueArg(argv, "--a-partir-de"),
    checkpoint: !argv.includes("--sem-checkpoint"),
    checkpointPath: parseValueArg(argv, "--checkpoint"),
  };
}

function formatEmpresaLabel(empresa: {
  codigo: string;
  nome: string;
  cnpj: string;
}): string {
  return [empresa.codigo, empresa.nome || empresa.cnpj].filter(Boolean).join(" - ");
}

function sanitizeCheckpointSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "batch";
}

function resolveUploadCheckpointPath(options: {
  cliPath?: string;
  envPath?: string;
  attachmentsDir?: string;
  skipAttachments: boolean;
}): string {
  const configured = options.cliPath || options.envPath;
  if (configured) return path.resolve(configured);

  const segment = options.attachmentsDir
    ? sanitizeCheckpointSegment(path.basename(path.resolve(options.attachmentsDir)))
    : "sem-anexos";

  return resolveRuntimePath("checkpoints", `upload-onvio-${segment}.json`);
}

function filterFromCode(empresas: EmpresaBatchItem[], codigo: string): EmpresaBatchItem[] | null {
  const wanted = normalizeCode(codigo);
  const index = empresas.findIndex((row) => normalizeCode(row.codigo) === wanted);
  return index >= 0 ? empresas.slice(index) : null;
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

  const aPartirDeFlagPresent =
    argv.includes("--a-partir-de") || argv.some((a) => a.startsWith("--a-partir-de="));
  if (aPartirDeFlagPresent && !cliFlags.aPartirDe) {
    console.error("Uso: --a-partir-de CODIGO, ex.: --a-partir-de 314");
    return 1;
  }

  const filterCount = [
    cliFlags.codigos && cliFlags.codigos.length > 0,
    cliFlags.limite != null,
    Boolean(cliFlags.aPartirDe),
  ].filter(Boolean).length;
  if (filterCount > 1) {
    console.error("Use apenas uma opcao: --limite, --codigos ou --a-partir-de.");
    return 1;
  }

  const attachmentsDir: string | undefined = skipAttachments
    ? undefined
    : env.unecontUploadDir ||
      findLatestNormalizedDir(undefined, { requireEligibleUploadFiles: true }) ||
      undefined;
  if (!skipAttachments && !attachmentsDir) {
    console.error(
      "Nenhum diretorio normalizado encontrado. Configure UNECONT_UPLOAD_DIR ou execute a normalizacao antes do upload.",
    );
    return 1;
  }

  const checkpoint =
    cliFlags.checkpoint && !dryRun
      ? new UploadCheckpoint(
          resolveUploadCheckpointPath({
            cliPath: cliFlags.checkpointPath,
            envPath: env.onvioUploadCheckpointPath,
            attachmentsDir,
            skipAttachments,
          }),
        )
      : null;
  checkpoint?.load();

  let batchInput: { empresas: EmpresaBatchItem[] };
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
  } else if (cliFlags.aPartirDe) {
    const todas = loadEmpresasFromExcel(excelPath);
    const empresas = filterFromCode(todas, cliFlags.aPartirDe);
    if (!empresas) {
      console.error(`Codigo "${cliFlags.aPartirDe}" nao encontrado na planilha (${excelPath}).`);
      return 1;
    }
    if (empresas.length === 0) {
      console.error("Planilha sem linhas para upload.");
      return 1;
    }
    console.log(
      `Upload a partir do codigo ${cliFlags.aPartirDe}: ${empresas.length} cliente(s) de ${todas.length} na planilha.`,
    );
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
    batchInput = { empresas: loadEmpresasFromExcel(excelPath) };
  }

  if (checkpoint) {
    const before = batchInput.empresas.length;
    batchInput = {
      empresas: batchInput.empresas.filter((empresa) => !checkpoint.isProcessed(empresa)),
    };
    const skippedByCheckpoint = before - batchInput.empresas.length;
    const stats = checkpoint.getStats();
    console.log(
      `[Onvio] Checkpoint: ${checkpoint.path} (${stats.processed} sucesso(s), ${stats.failed} falha(s) registrada(s)).`,
    );
    if (skippedByCheckpoint > 0) {
      console.log(`[Onvio] Checkpoint: ${skippedByCheckpoint} solicitacao(oes) ja enviada(s) serao puladas.`);
    }
    if (batchInput.empresas.length === 0) {
      console.log("[Onvio] Checkpoint: nenhuma solicitacao pendente para enviar.");
      return 0;
    }
  }

  if (!skipAttachments && attachmentsDir) {
    try {
      // Gate sobre a planilha completa do lote (nao so o restante do checkpoint),
      // para nao enviar nada se houver arquivo trocado no diretorio.
      const todasParaGate = loadEmpresasFromExcel(excelPath);
      assertNoAttachmentIdentityMismatches(todasParaGate, attachmentsDir);
      console.log(`[Onvio] Gate de identidade: OK (${attachmentsDir}).`);
    } catch (error) {
      console.error(
        "Erro na execucao:",
        error instanceof Error ? error.message : String(error),
      );
      return 1;
    }
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

  const tokenForClientUserLookup = tokenForBatch || readCachedUdsLongTokenForUpload();
  const canOnvioAutoRefreshForLookup =
    env.onvioAutoRefreshToken &&
    env.onvioEmail.trim() !== "" &&
    env.onvioPassword.trim() !== "";
  const onUnauthorizedForLookup =
    onUnauthorized ??
    (canOnvioAutoRefreshForLookup
      ? async () => {
          console.warn(
            "[Onvio] Resposta 401 na consulta de usuarios do cliente. Renovando UDSLongToken via shared/onvio-auth...",
          );
          return refreshUdsLongTokenForUpload();
        }
      : undefined);

  const resolveRequesterId = tokenForClientUserLookup
    ? createClientUsersRequesterResolver(
        new OnvioHttpClientUsersProvider({
          token: tokenForClientUserLookup,
          baseUrl: env.onvioBaseUrl,
          firmCompanyId: env.onvioFirmCompanyId,
          cookie: env.onvioCookie,
          onUnauthorized: onUnauthorizedForLookup,
        }),
      )
    : undefined;

  const identifierProvider = tokenForClientUserLookup
    ? createOnvioDepartmentsIdentifierProvider(
        new OnvioHttpDepartmentsProvider({
          token: tokenForClientUserLookup,
          baseUrl: env.onvioBaseUrl,
          firmCompanyId: env.onvioFirmCompanyId,
          cookie: env.onvioCookie,
          onUnauthorized: onUnauthorizedForLookup,
        }),
      )
    : undefined;

  if (identifierProvider) {
    console.log("[Onvio] Departamentos: lookup via API Onvio (sem BD).");
  } else {
    console.warn(
      "[Onvio] Sem token para listar departamentos; use ONVIO_DEPARTMENT_ID/ONVIO_DEPARTMENT_NAME ou coluna ONVIO_DEPARTMENT_ID.",
    );
  }

  try {
    const result = await uploadOnvioBatch({
      token: tokenForBatch,
      input: batchInput,
      attachmentsDir,
      attachmentsMode: skipAttachments ? "none" : "required",
      dryRun,
      // Planilha (ONVIO_CLIENT_ID) + Onvio (departamentos/solicitantes); BD fora do fluxo.
      identifierProvider,
      extraAttachmentPaths,
      onUnauthorized,
      resolveRequesterId,
      onProgress: (evt) => {
        logUploadOnvioProgress(evt);
        if (!checkpoint || evt.type !== "item_done") return;
        if (evt.outcome === "success") {
          checkpoint.markSuccess(evt.row, evt.ticketId, evt.message);
        } else if (evt.outcome === "failed") {
          checkpoint.markFailed(evt.row, evt.message);
        }
      },
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
    } else {
      for (const item of result.items) {
        const empresaLabel = formatEmpresaLabel(item.empresa);
        if (item.status === "failed") {
          console.error(`[ERRO] ${empresaLabel}: ${item.message ?? "Falha sem mensagem."}`);
        }

        const warnings = item.warnings ?? [];
        const solicitantePreenchido = item.empresa.solicitante.trim().length > 0;
        const solicitanteSemId =
          solicitantePreenchido &&
          !item.resolvedRequesterId?.trim() &&
          !item.empresa.onvioRequesterId?.trim();
        const jaAvisouSolicitante = warnings.some((warning) =>
          warning.includes("sem ID do Onvio resolvido"),
        );

        for (const warning of warnings) {
          console.warn(`[AVISO] ${empresaLabel}: ${warning}`);
        }

        if (solicitanteSemId && !jaAvisouSolicitante) {
          console.warn(
            `[AVISO] ${empresaLabel}: Solicitante "${item.empresa.solicitante}" sem ID do Onvio resolvido; o portal exibira o campo vazio.`,
          );
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
