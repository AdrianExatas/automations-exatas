import ExcelJS from "exceljs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { MAILBOX_COLUMNS, type MailboxMessage } from "./sefaz-client.js";

export async function writeMailboxWorkbook(
  filePath: string,
  messages: MailboxMessage[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Notificacoes");

  worksheet.columns = MAILBOX_COLUMNS.map(({ header, key }) => ({
    header,
    key,
    width: Math.max(header.length + 2, 18),
  }));

  for (const message of messages) {
    worksheet.addRow({
      emitente: message.emitente,
      assunto: message.assunto,
      classificacao: message.classificacao,
      dataEnvio: message.dataEnvio,
      dataLeitura: message.dataLeitura,
      exigeCiencia: message.exigeCiencia,
      situacao: message.situacao,
      vencimento: message.vencimento,
    });
  }

  worksheet.getRow(1).font = { bold: true };

  await mkdir(dirname(filePath), { recursive: true });
  await workbook.xlsx.writeFile(filePath);
}
