import fs from "node:fs";
import path from "node:path";
import { loadBdLookupData } from "./api/bd-api";
import {
  buildAvailableUploadFiles,
  buildUploadDescription,
  buildUploadSubject,
  resolveAttachmentsForEmpresa,
  resolveUploadIdentifiers,
  UploadResolutionError,
  type UploadLookupMaps,
} from "./adapters/unecont/upload-onvio-helpers";
import { DEFAULT_BD_API_BASE_URL } from "./constants";
import { resolveEmpresasInput } from "./input";
import { OnvioApiError, uploadTicketWithAttachments } from "./core/onvio-api";
import type { UploadBatchItemResult, UploadBatchResult, UploadOnvioOptions } from "./types";

function emptyLookupMaps(): UploadLookupMaps {
  return {
    clientIdByCode: new Map(),
    requesterIdByName: new Map(),
    departmentIdByName: new Map(),
  };
}

export async function uploadOnvioBatch(options: UploadOnvioOptions): Promise<UploadBatchResult> {
  const empresas = resolveEmpresasInput(options.input);
  const attachmentsDir = path.resolve(options.attachmentsDir);
  const warnings: string[] = [];

  if (!options.token.trim()) {
    throw new Error("Token do Onvio nao informado.");
  }

  if (!fs.existsSync(attachmentsDir)) {
    throw new Error(`Diretorio de anexos nao encontrado: ${attachmentsDir}`);
  }

  let lookups = emptyLookupMaps();
  const bdApiBaseUrl = options.bdApiBaseUrl ?? DEFAULT_BD_API_BASE_URL;
  try {
    lookups = await loadBdLookupData(bdApiBaseUrl);
  } catch (error) {
    warnings.push(
      `Falha ao carregar dados da API do BD (${bdApiBaseUrl}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const availableFiles = buildAvailableUploadFiles(attachmentsDir);
  if (availableFiles.length === 0) {
    throw new Error(`Nenhum arquivo PDF/XLSX elegivel encontrado em ${attachmentsDir}`);
  }

  const items: UploadBatchItemResult[] = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const empresa of empresas) {
    const itemWarnings = [...warnings];

    try {
      const attachments = resolveAttachmentsForEmpresa(empresa, availableFiles);
      const resolvedIdentifiers = resolveUploadIdentifiers(empresa, lookups, options.defaults);
      itemWarnings.push(...resolvedIdentifiers.warnings);

      if (
        empresa.qtdArquivos != null &&
        empresa.qtdArquivos >= 0 &&
        empresa.qtdArquivos !== attachments.length
      ) {
        itemWarnings.push(
          `QTD_ARQUIVOS (${empresa.qtdArquivos}) difere dos anexos resolvidos (${attachments.length}).`,
        );
      }

      const subject = empresa.assunto.trim() || buildUploadSubject(empresa);
      const description =
        empresa.descricao.trim() || buildUploadDescription(empresa, attachments.length);

      const response = await uploadTicketWithAttachments({
        token: options.token,
        clientId: resolvedIdentifiers.clientId,
        departmentId: resolvedIdentifiers.departmentId,
        requesterId: resolvedIdentifiers.requesterId,
        subject,
        description,
        attachments: attachments.map((attachment) => ({
          fileBuffer: fs.readFileSync(attachment.filePath),
          fileName: attachment.fileName,
        })),
      });

      success++;
      items.push({
        empresa,
        status: "success",
        message: `${attachments.length} anexo(s) enviado(s).`,
        ticketId: response.ticketId,
        attachmentCount: attachments.length,
        warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
      });
    } catch (error) {
      failed++;
      const message =
        error instanceof UploadResolutionError || error instanceof OnvioApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);

      items.push({
        empresa,
        status: "failed",
        message,
        warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
      });
    }
  }

  return {
    summary: {
      total: empresas.length,
      success,
      failed,
      skipped,
    },
    items,
    warnings,
  };
}
