import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

import type { CompanyMailboxResult } from "./mailbox/types.js";

export const OUTPUT_DIRECTORY = path.join(process.cwd(), "output", "spreadsheets");

function timestampForFileName(referenceDate: Date): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  const hours = String(referenceDate.getHours()).padStart(2, "0");
  const minutes = String(referenceDate.getMinutes()).padStart(2, "0");
  const seconds = String(referenceDate.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function buildWorkbookPath(referenceDate = new Date()): string {
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  return path.join(
    OUTPUT_DIRECTORY,
    `caixa-entrada-sefaz-pi-${timestampForFileName(referenceDate)}.xlsx`,
  );
}

export async function writeNotificationsWorkbook(
  results: CompanyMailboxResult[],
  outputPath = buildWorkbookPath(),
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Notificacoes");

  worksheet.columns = [
    { header: "CODIGO", key: "code", width: 12 },
    { header: "EMPRESA", key: "companyName", width: 40 },
    { header: "CNPJ", key: "cnpj", width: 22 },
    { header: "INSCRICAO_ESTADUAL", key: "stateRegistration", width: 20 },
    { header: "RESULTADO", key: "result", width: 28 },
    { header: "ERRO", key: "errorMessage", width: 40 },
    { header: "STATUS", key: "status", width: 14 },
    { header: "SITUACAO_CIENCIA", key: "scienceSituation", width: 22 },
    { header: "TIPO", key: "type", width: 18 },
    { header: "INSCRICAO_DESTINATARIO", key: "recipientRegistration", width: 34 },
    { header: "REMETENTE", key: "sender", width: 18 },
    { header: "DATA_EMISSAO", key: "issuedAtText", width: 22 },
    { header: "ASSUNTO", key: "subject", width: 60 },
    { header: "DATA_LEITURA", key: "readAtText", width: 22 },
    { header: "DATA_CIENCIA", key: "scienceAtText", width: 22 },
    { header: "VISUALIZAVEL_ATE", key: "viewableUntilText", width: 22 },
  ];

  for (const result of results) {
    if (result.notifications.length === 0) {
      worksheet.addRow({
        code: result.company.code,
        companyName: result.company.name,
        cnpj: result.company.cnpj,
        stateRegistration: result.company.stateRegistrationDisplay,
        result: result.result,
        errorMessage: result.errorMessage ?? "",
      });
      continue;
    }

    for (const notification of result.notifications) {
      worksheet.addRow({
        code: result.company.code,
        companyName: result.company.name,
        cnpj: result.company.cnpj,
        stateRegistration: result.company.stateRegistrationDisplay,
        result: result.result,
        errorMessage: result.errorMessage ?? "",
        status: notification.status,
        scienceSituation: notification.scienceSituation,
        type: notification.type,
        recipientRegistration: notification.recipientRegistration,
        sender: notification.sender,
        issuedAtText: notification.issuedAtText,
        subject: notification.subject,
        readAtText: notification.readAtText,
        scienceAtText: notification.scienceAtText,
        viewableUntilText: notification.viewableUntilText,
      });
    }
  }

  worksheet.getRow(1).font = { bold: true };
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}
