import path from "node:path";
import {
  loadServiceRequestsFromExcel,
  sendServiceRequestsBatch,
  type SendServiceRequestsProgressEvent,
  type ServiceRequestBatchResult,
} from "@exatas/onvio-solicitacoes-servico";
import { mergeUiAttachments } from "./attachments-ui";
import {
  checkpointKey,
  checkpointPathForSheet,
  readCheckpoint,
  writeCheckpoint,
} from "./checkpoint";
import { buildIdentifierSupport } from "./onvio/load-identifiers";
import { writeExecutionReport } from "./report";
import { DEFAULT_ONVIO_FIRM_COMPANY_ID, type RunBatchPayload } from "./types";

export interface RunBatchOptions extends RunBatchPayload {
  token: string;
  firmCompanyId?: string;
  userDataDir: string;
  onUnauthorized?: () => Promise<string>;
  onProgress?: (event: SendServiceRequestsProgressEvent) => void;
  onLog?: (message: string) => void;
  shouldCancel?: () => boolean;
}

export async function runServiceRequestsBatch(options: RunBatchOptions): Promise<{
  result: ServiceRequestBatchResult;
  jsonPath: string;
  xlsxPath: string;
  backupPath: string;
}> {
  const rows = loadServiceRequestsFromExcel(options.planilhaPath);
  if (rows.length === 0) {
    throw new Error("A planilha nao contem solicitacoes validas.");
  }

  const merged = mergeUiAttachments(rows, options.rowAttachments, options.commonAttachments);
  const checkpointFile = checkpointPathForSheet(options.userDataDir, options.planilhaPath);
  const previous = options.startWithoutCheckpoint ? null : readCheckpoint(checkpointFile);
  const successSet = new Set(previous?.successKeys ?? []);

  const failedSet = new Set(previous?.failedKeys ?? []);
  const pending = merged.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => {
      const key = checkpointKey(row, index);
      if (options.reprocessFailures) return failedSet.has(key);
      if (successSet.has(key)) return false;
      return true;
    });

  const pendingRows = pending.map((item) => item.row);
  if (pendingRows.length === 0) {
    throw new Error("Nao ha itens pendentes. Use iniciar sem checkpoint para reprocessar tudo.");
  }
  options.onLog?.(
    pendingRows.length === merged.rows.length
      ? `Preparando ${pendingRows.length} solicitacao(oes).`
      : `Preparando ${pendingRows.length} de ${merged.rows.length} solicitacao(oes) (checkpoint).`,
  );

  const identifiers = await buildIdentifierSupport(
    {
      token: options.token,
      firmCompanyId: options.firmCompanyId || DEFAULT_ONVIO_FIRM_COMPANY_ID,
      cookie: `UDSLongToken=${options.token}`,
      onUnauthorized: options.onUnauthorized,
    },
    pendingRows,
  );

  const result = await sendServiceRequestsBatch({
    token: options.token,
    input: { serviceRequests: pendingRows },
    mode: "optional-attachments",
    attachmentStrategy: "explicit",
    validateAttachmentIdentity: false,
    extraAttachmentPaths: merged.extraAttachmentPaths,
    identifierProvider: identifiers.identifierProvider,
    resolveRequesterId: identifiers.resolveRequesterId,
    defaults: {
      departmentId: options.defaultDepartmentId?.trim() || undefined,
      departmentName: options.defaultDepartmentName?.trim() || undefined,
    },
    dryRun: options.dryRun,
    onUnauthorized: options.onUnauthorized,
    onProgress: options.onProgress,
    shouldCancel: options.shouldCancel,
  });

  if (result.summary.cancelled) {
    options.onLog?.(
      `Envio cancelado: ${result.summary.success} enviada(s), ${result.summary.skipped} nao enviada(s).`,
    );
  }
  if (!options.dryRun) {
    const nextSuccess = new Set(successSet);
    const nextFailed = new Set<string>();
    result.items.forEach((item, offset) => {
      const original = pending[offset];
      if (!original) return;
      const key = checkpointKey(original.row, original.index);
      if (item.status === "success") {
        nextSuccess.add(key);
        nextFailed.delete(key);
      } else if (item.status === "failed") {
        nextFailed.add(key);
      }
    });
    writeCheckpoint(checkpointFile, {
      planilhaPath: options.planilhaPath,
      successKeys: [...nextSuccess],
      failedKeys: [...nextFailed],
      updatedAt: new Date().toISOString(),
    });
  }

  const reportsDir = path.join(options.userDataDir, "relatorios");
  const paths = writeExecutionReport(reportsDir, result, {
    planilhaPath: options.planilhaPath,
    defaultDepartmentName: options.defaultDepartmentName,
    defaultDepartmentId: options.defaultDepartmentId,
  });
  if (paths.backupPath) {
    options.onLog?.(`Backup para reversao: ${paths.backupPath}`);
  }
  return { result, ...paths };
}

export function formatProgress(event: SendServiceRequestsProgressEvent): string {
  if (event.type === "batch_start") {
    return `Iniciando lote com ${event.total} item(ns).`;
  }
  if (event.type === "item_start") {
    const label = [event.row.codigo, event.row.nome || event.row.cnpj].filter(Boolean).join(" - ");
    return `[${event.index}/${event.total}] Enviando ${label}...`;
  }
  const label = [event.row.codigo, event.row.nome || event.row.cnpj].filter(Boolean).join(" - ");
  return `[${event.index}/${event.total}] ${event.outcome.toUpperCase()} ${label}${
    event.message ? `: ${event.message}` : ""
  }`;
}
