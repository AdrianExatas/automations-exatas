import fs from "node:fs";
import path from "node:path";
import { matchEmpresaFileIdentity } from "./empresa-file-identity";
import type { EmpresaBatchItem } from "./types";
import {
  buildAvailableUploadFiles,
  filenameHasExactCodeToken,
  normalizeCode,
} from "./scripts/upload-onvio-helpers";

export interface AttachmentIdentityMismatch {
  codigo: string;
  empresa: string;
  fileName: string;
  reason: string;
}

/**
 * Scans the attachments directory and fails closed if any .xlsx matched by CODIGO
 * does not share distinctive name tokens with the planilha company.
 */
export function findAttachmentIdentityMismatches(
  empresas: EmpresaBatchItem[],
  attachmentsDir: string,
): AttachmentIdentityMismatch[] {
  const files = buildAvailableUploadFiles(attachmentsDir);
  const mismatches: AttachmentIdentityMismatch[] = [];

  for (const empresa of empresas) {
    const nome = empresa.nome?.trim();
    if (!nome || !empresa.codigo) continue;

    const candidates =
      empresa.arquivos.length > 0
        ? files.filter((file) =>
            empresa.arquivos.some(
              (arquivo) =>
                path.basename(arquivo).toLowerCase() === file.fileName.toLowerCase(),
            ),
          )
        : files.filter((file) => filenameHasExactCodeToken(file.fileName, empresa.codigo));

    for (const file of candidates) {
      if (file.extension.toLowerCase() !== ".xlsx") continue;
      const identity = matchEmpresaFileIdentity(file.fileName, nome);
      if (!identity.ok) {
        mismatches.push({
          codigo: normalizeCode(empresa.codigo),
          empresa: nome,
          fileName: file.fileName,
          reason: identity.reason,
        });
      }
    }
  }

  return mismatches;
}

export function assertNoAttachmentIdentityMismatches(
  empresas: EmpresaBatchItem[],
  attachmentsDir: string,
): void {
  if (!attachmentsDir || !fs.existsSync(attachmentsDir)) {
    throw new Error(`Diretorio de anexos inexistente para gate de identidade: ${attachmentsDir}`);
  }

  const mismatches = findAttachmentIdentityMismatches(empresas, attachmentsDir);
  if (mismatches.length === 0) return;

  const preview = mismatches
    .slice(0, 10)
    .map((m) => `- ${m.codigo} | ${m.empresa} | ${m.fileName}`)
    .join("\n");
  throw new Error(
    `Abortando upload: ${mismatches.length} anexo(s) com identidade incompativel (empresa x arquivo).\n${preview}`,
  );
}
