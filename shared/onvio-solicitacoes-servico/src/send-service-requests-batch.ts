import fs from "node:fs";
import path from "node:path";
import { legacyUnecontDefaultContent } from "./adapters/unecont/service-request-helpers";
import {
  AttachmentResolutionError,
  buildAvailableAttachmentFiles,
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
    warnings: item.warnings,
  }));
}

function buildAttachmentBuffers(attachments: ResolvedAttachmentFile[]) {
  return attachments.map((attachment) => ({
    fileBuffer: fs.readFileSync(attachment.filePath),
    fileName: attachment.fileName,
  }));
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
  }

  const defaultContent = resolveDefaultContent(options);
  const items: ServiceRequestBatchItemResult[] = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const serviceRequest of serviceRequests) {
    const itemWarnings = [...warnings];

    try {
      const attachments =
        mode === "attachments"
          ? resolveAttachmentsForServiceRequest(serviceRequest, availableFiles, attachmentStrategy)
          : [];
      const resolvedIdentifiers = resolveServiceRequestIdentifiers(
        serviceRequest,
        lookupData,
        options.defaults,
      );
      itemWarnings.push(...resolvedIdentifiers.warnings);

      if (
        mode === "attachments" &&
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
        items.push({
          serviceRequest,
          status: "skipped",
          message:
            mode === "no-attachments"
              ? "Pre-validacao OK: solicitacao sem anexos seria aberta."
              : `Pre-validacao OK: ${attachments.length} anexo(s) seriam enviados.`,
          attachmentCount: attachments.length,
          warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
        });
        continue;
      }

      if (mode === "no-attachments") {
        const response = await openTicket({
          token: options.token,
          clientId: resolvedIdentifiers.clientId,
          departmentId: resolvedIdentifiers.departmentId,
          requesterId: resolvedIdentifiers.requesterId,
          subject,
          description,
        });

        success++;
        items.push({
          serviceRequest,
          status: "success",
          message: "Solicitacao aberta sem anexos.",
          ticketId: response.ticketId,
          attachmentCount: 0,
          warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
        });
        continue;
      }

      const response = await uploadTicketWithAttachments({
        token: options.token,
        clientId: resolvedIdentifiers.clientId,
        departmentId: resolvedIdentifiers.departmentId,
        requesterId: resolvedIdentifiers.requesterId,
        subject,
        description,
        attachments: buildAttachmentBuffers(attachments),
      });

      success++;
      items.push({
        serviceRequest,
        status: "success",
        message: `${attachments.length} anexo(s) enviado(s).`,
        ticketId: response.ticketId,
        attachmentCount: attachments.length,
        warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
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
    }
  }

  return {
    summary: {
      total: serviceRequests.length,
      success,
      failed,
      skipped,
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
