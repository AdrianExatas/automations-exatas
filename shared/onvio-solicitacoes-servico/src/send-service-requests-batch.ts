import fs from "node:fs";
import path from "node:path";
import { legacyUnecontDefaultContent } from "./adapters/unecont/service-request-helpers";
import {
  AttachmentResolutionError,
  buildAvailableAttachmentFiles,
  normalizeCode,
  type ResolvedAttachmentFile,
  resolveAttachmentsForServiceRequest,
} from "./attachments/resolver";
import { DEFAULT_BD_API_BASE_URL } from "./constants";
import { resolveServiceRequestsInput } from "./input";
import { loadBdLookupData } from "./api/bd-api";
import { openTicket, OnvioApiError, uploadTicketWithAttachments } from "./core/onvio-api";
import {
  buildDefaultServiceRequestDescription,
  buildDefaultServiceRequestSubject,
} from "./service-request-defaults";
import {
  resolveServiceRequestIdentifiers,
  ServiceRequestIdentifierResolutionError,
} from "./service-request-identifiers";
import type {
  SendServiceRequestsOptions,
  ServiceRequestBatchItemResult,
  ServiceRequestBatchResult,
  ServiceRequestIdentifierLookupData,
  ServiceRequestMode,
} from "./types";

function emptyLookupData(): ServiceRequestIdentifierLookupData {
  return {
    clientIdByCode: new Map(),
    requesterIdByName: new Map(),
    departmentIdByName: new Map(),
  };
}

function normalizeMode(options: SendServiceRequestsOptions): ServiceRequestMode {
  if (options.mode) return options.mode;
  if (options.attachmentsMode === "none") return "no-attachments";
  return "attachments";
}

function usesResolvedAttachments(mode: ServiceRequestMode): boolean {
  return mode === "attachments" || mode === "optional-attachments";
}

function resolveDefaultContent(options: SendServiceRequestsOptions) {
  return options.defaultContent ?? {
    subject: buildDefaultServiceRequestSubject,
    description: (row, context) =>
      buildDefaultServiceRequestDescription(row, context.attachmentCount),
  };
}

async function loadLookupData(
  options: SendServiceRequestsOptions,
  warnings: string[],
): Promise<ServiceRequestIdentifierLookupData> {
  if (options.identifierProvider) {
    try {
      return await options.identifierProvider.loadLookupData();
    } catch (error) {
      warnings.push(
        `Falha ao carregar dados do provider de IDs: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return emptyLookupData();
    }
  }

  if (!options.bdApiBaseUrl) {
    return emptyLookupData();
  }

  try {
    return await loadBdLookupData(options.bdApiBaseUrl);
  } catch (error) {
    const baseUrl = options.bdApiBaseUrl ?? DEFAULT_BD_API_BASE_URL;
    warnings.push(
      `Falha ao carregar dados da API do BD (${baseUrl}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return emptyLookupData();
  }
}

function mapLegacyItems(items: ServiceRequestBatchItemResult[]) {
  return items.map((item) => ({
    empresa: item.serviceRequest,
    status: item.status,
    message: item.message,
    ticketId: item.ticketId,
    attachmentCount: item.attachmentCount,
    resolvedRequesterId: item.resolvedRequesterId,
    warnings: item.warnings,
  }));
}

function normalizeResolveRequesterIdResult(
  value: string | { requesterId?: string; warnings?: string[] } | undefined,
): { requesterId?: string; warnings: string[] } {
  if (value == null) return { warnings: [] };
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { requesterId: trimmed, warnings: [] } : { warnings: [] };
  }
  const requesterId = value.requesterId?.trim() || undefined;
  return { requesterId, warnings: value.warnings ?? [] };
}

function buildAttachmentBuffers(attachments: ResolvedAttachmentFile[]) {
  return attachments.map((attachment) => ({
    fileBuffer: fs.readFileSync(attachment.filePath),
    fileName: attachment.fileName,
  }));
}

function resolveExtraAttachmentPaths(rawPaths: string[]): ResolvedAttachmentFile[] {
  const out: ResolvedAttachmentFile[] = [];
  for (const raw of rawPaths) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const abs = path.resolve(trimmed);
    if (!fs.existsSync(abs)) {
      throw new Error(`Anexo extra nao encontrado: ${abs}`);
    }
    const st = fs.statSync(abs);
    if (!st.isFile()) {
      throw new Error(`Anexo extra nao e um arquivo: ${abs}`);
    }
    const fileName = path.basename(abs);
    out.push({
      filePath: abs,
      fileName,
      extension: path.extname(fileName).toLowerCase(),
    });
  }
  return out;
}

function appendExtraAttachments(
  primary: ResolvedAttachmentFile[],
  extras: ResolvedAttachmentFile[],
): ResolvedAttachmentFile[] {
  const seen = new Set(primary.map((f) => path.resolve(f.filePath).toLowerCase()));
  const merged = [...primary];
  for (const f of extras) {
    const key = path.resolve(f.filePath).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(f);
    }
  }
  return merged;
}

function createOnvio401Retry(options: SendServiceRequestsOptions) {
  const tokenState = { token: options.token.trim() };
  const refreshState = { consumed: false };

  return async function callOnvio<T>(operation: (token: string) => Promise<T>): Promise<T> {
    try {
      return await operation(tokenState.token);
    } catch (error) {
      if (
        error instanceof OnvioApiError &&
        error.status === 401 &&
        options.onUnauthorized &&
        !refreshState.consumed
      ) {
        refreshState.consumed = true;
        const next = (await options.onUnauthorized()).trim();
        if (!next) {
          throw new Error("onUnauthorized retornou token vazio.");
        }
        tokenState.token = next;
        return await operation(tokenState.token);
      }
      throw error;
    }
  };
}

export async function sendServiceRequestsBatch(
  options: SendServiceRequestsOptions,
): Promise<ServiceRequestBatchResult> {
  const serviceRequests = resolveServiceRequestsInput(options.input);
  const mode = normalizeMode(options);
  const dryRun = options.dryRun ?? false;
  const attachmentStrategy = options.attachmentStrategy ?? "explicit";
  const attachmentsDir = options.attachmentsDir ? path.resolve(options.attachmentsDir) : undefined;
  const warnings: string[] = [];

  if (!dryRun && !options.token.trim()) {
    throw new Error("Token do Onvio nao informado.");
  }

  const lookupData = await loadLookupData(options, warnings);

  const validateAttachmentIdentity = options.validateAttachmentIdentity !== false;
  let availableFiles = [] as ResolvedAttachmentFile[];
  if (mode === "attachments") {
    if (!attachmentsDir) {
      throw new Error("Diretorio de anexos nao informado.");
    }

    if (!fs.existsSync(attachmentsDir)) {
      throw new Error(`Diretorio de anexos nao encontrado: ${attachmentsDir}`);
    }

    availableFiles = buildAvailableAttachmentFiles(attachmentsDir);
    if (availableFiles.length === 0) {
      throw new Error(`Nenhum arquivo PDF/XLSX elegivel encontrado em ${attachmentsDir}`);
    }
  } else if (mode === "optional-attachments" && attachmentsDir && fs.existsSync(attachmentsDir)) {
    availableFiles = buildAvailableAttachmentFiles(attachmentsDir);
  }

  let extraAttachmentFiles = [] as ResolvedAttachmentFile[];
  if (usesResolvedAttachments(mode) && options.extraAttachmentPaths?.length) {
    extraAttachmentFiles = resolveExtraAttachmentPaths(options.extraAttachmentPaths);
  }

  const defaultContent = resolveDefaultContent(options);
  const items: ServiceRequestBatchItemResult[] = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;
  let cancelled = false;

  const callOnvio = dryRun ? null : createOnvio401Retry(options);
  const onProgress = options.onProgress;
  const totalCount = serviceRequests.length;

  onProgress?.({ type: "batch_start", total: totalCount });

  for (let i = 0; i < serviceRequests.length; i++) {
    if (options.shouldCancel?.()) {
      cancelled = true;
      for (let j = i; j < serviceRequests.length; j++) {
        const remaining = serviceRequests[j]!;
        const remainingIndex = j + 1;
        skipped++;
        const cancelMessage = "Cancelado pelo usuario.";
        items.push({
          serviceRequest: remaining,
          status: "skipped",
          message: cancelMessage,
        });
        onProgress?.({
          type: "item_done",
          index: remainingIndex,
          total: totalCount,
          row: remaining,
          outcome: "skipped",
          message: cancelMessage,
        });
      }
      break;
    }

    const serviceRequest = serviceRequests[i]!;
    const index = i + 1;
    const total = totalCount;

    onProgress?.({ type: "item_start", index, total, row: serviceRequest });

    const itemWarnings = [...warnings];

    try {
      let attachments: ResolvedAttachmentFile[] = [];
      if (usesResolvedAttachments(mode)) {
        attachments = resolveAttachmentsForServiceRequest(
          serviceRequest,
          availableFiles,
          attachmentStrategy,
          {
            validateIdentity: validateAttachmentIdentity,
            allowMissing: mode === "optional-attachments",
          },
        );
        if (extraAttachmentFiles.length > 0) {
          attachments = appendExtraAttachments(attachments, extraAttachmentFiles);
        }
      }
      let clientRequesterId: string | undefined;
      if (
        !serviceRequest.onvioRequesterId?.trim() &&
        serviceRequest.solicitante.trim() &&
        options.resolveRequesterId
      ) {
        const mappedClientId = lookupData.clientIdByCode.get(normalizeCode(serviceRequest.codigo));
        const rowForRequesterResolution = {
          ...serviceRequest,
          onvioClientId:
            serviceRequest.onvioClientId?.trim() || mappedClientId || serviceRequest.onvioClientId,
        };
        try {
          const resolvedRequester = normalizeResolveRequesterIdResult(
            await options.resolveRequesterId(rowForRequesterResolution),
          );
          clientRequesterId = resolvedRequester.requesterId;
          if (resolvedRequester.warnings.length > 0) {
            itemWarnings.push(...resolvedRequester.warnings);
          }
        } catch (error) {
          itemWarnings.push(
            `Falha ao resolver solicitante via usuarios do cliente: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const resolvedIdentifiers = resolveServiceRequestIdentifiers(
        serviceRequest,
        lookupData,
        options.defaults,
        { clientRequesterId },
      );
      itemWarnings.push(...resolvedIdentifiers.warnings);
      const resolvedRequesterId = resolvedIdentifiers.requesterId;

      if (
        usesResolvedAttachments(mode) &&
        serviceRequest.qtdArquivos != null &&
        serviceRequest.qtdArquivos >= 0 &&
        serviceRequest.qtdArquivos !== attachments.length
      ) {
        itemWarnings.push(
          `QTD_ARQUIVOS (${serviceRequest.qtdArquivos}) difere dos anexos resolvidos (${attachments.length}).`,
        );
      }

      const subject =
        serviceRequest.assunto.trim() ||
        defaultContent.subject?.(serviceRequest) ||
        buildDefaultServiceRequestSubject(serviceRequest);
      const description =
        serviceRequest.descricao.trim() ||
        defaultContent.description?.(serviceRequest, { attachmentCount: attachments.length }) ||
        buildDefaultServiceRequestDescription(serviceRequest, attachments.length);

      if (dryRun) {
        skipped++;
        const skipMessage =
          attachments.length === 0
            ? "Pre-validacao OK: solicitacao sem anexos seria aberta."
            : `Pre-validacao OK: ${attachments.length} anexo(s) seriam enviados.`;
        items.push({
          serviceRequest,
          status: "skipped",
          message: skipMessage,
          attachmentCount: attachments.length,
          resolvedRequesterId,
          warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
        });
        onProgress?.({
          type: "item_done",
          index,
          total,
          row: serviceRequest,
          outcome: "skipped",
          message: skipMessage,
        });
        continue;
      }

      if (attachments.length === 0) {
        const response = await callOnvio!((token) =>
          openTicket({
            token,
            clientId: resolvedIdentifiers.clientId,
            departmentId: resolvedIdentifiers.departmentId,
            requesterId: resolvedIdentifiers.requesterId,
            subject,
            description,
          }),
        );

        success++;
        items.push({
          serviceRequest,
          status: "success",
          message: "Solicitacao aberta sem anexos.",
          ticketId: response.ticketId,
          attachmentCount: 0,
          resolvedRequesterId,
          warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
        });
        onProgress?.({
          type: "item_done",
          index,
          total,
          row: serviceRequest,
          outcome: "success",
          message: "Solicitacao aberta sem anexos.",
          ticketId: response.ticketId,
        });
        continue;
      }

      const response = await callOnvio!((token) =>
        uploadTicketWithAttachments({
          token,
          clientId: resolvedIdentifiers.clientId,
          departmentId: resolvedIdentifiers.departmentId,
          requesterId: resolvedIdentifiers.requesterId,
          subject,
          description,
          attachments: buildAttachmentBuffers(attachments),
        }),
      );

      success++;
      const successMessage = `${attachments.length} anexo(s) enviado(s).`;
      items.push({
        serviceRequest,
        status: "success",
        message: successMessage,
        ticketId: response.ticketId,
        attachmentCount: attachments.length,
        resolvedRequesterId,
        warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
      });
      onProgress?.({
        type: "item_done",
        index,
        total,
        row: serviceRequest,
        outcome: "success",
        message: successMessage,
        ticketId: response.ticketId,
      });
    } catch (error) {
      failed++;
      const message =
        error instanceof AttachmentResolutionError ||
        error instanceof ServiceRequestIdentifierResolutionError ||
        error instanceof OnvioApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);

      items.push({
        serviceRequest,
        status: "failed",
        message,
        warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
      });
      onProgress?.({
        type: "item_done",
        index,
        total,
        row: serviceRequest,
        outcome: "failed",
        message,
      });
    }
  }

  return {
    summary: {
      total: serviceRequests.length,
      success,
      failed,
      skipped,
      ...(cancelled ? { cancelled: true } : {}),
    },
    items,
    warnings,
  };
}

export async function uploadOnvioBatch(options: SendServiceRequestsOptions) {
  const result = await sendServiceRequestsBatch({
    ...options,
    attachmentStrategy: options.attachmentStrategy ?? "code-fallback",
    defaultContent: options.defaultContent ?? legacyUnecontDefaultContent,
  });

  return {
    summary: result.summary,
    items: mapLegacyItems(result.items),
    warnings: result.warnings,
  };
}
