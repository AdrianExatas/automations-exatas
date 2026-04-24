import { resolve } from "node:path";

import { writeMailboxWorkbook } from "./excel.js";
import {
  createDateWindow,
  formatDateForFilename,
  type MailboxMessage,
  RequestRetriesExhaustedError,
  SefazClient,
  SessionConflictError,
  slugifyCompanyName,
} from "./sefaz-client.js";

const COMPANY_NAME = "A A FERREIRA LTDA";
const BASE_URL = "https://sefaznet.sefaz.ma.gov.br";

async function main(): Promise<void> {
  const referenceDate = new Date();
  const dateWindow = createDateWindow(referenceDate);
  const outputFile = resolve(
    process.cwd(),
    "output",
    `notificacoes-${slugifyCompanyName(COMPANY_NAME)}-${formatDateForFilename(referenceDate)}.xlsx`,
  );
  const companyDirectory = resolve(process.cwd(), "certificados", COMPANY_NAME);

  const client = new SefazClient({
    baseUrl: BASE_URL,
    pfxPath: resolve(companyDirectory, "A A FERREIRA LTDA_10633978000144.pfx"),
    passphrasePath: resolve(companyDirectory, "SENHA.txt"),
    companyName: COMPANY_NAME,
    dateWindow,
  });

  try {
    console.log(`[${new Date().toISOString()}] [job] iniciando execucao do extrator`);
    console.log(`[${new Date().toISOString()}] [job] empresa: ${COMPANY_NAME}`);
    console.log(`[${new Date().toISOString()}] [job] saida esperada: ${outputFile}`);
    const messages = await client.fetchMessages();
    console.log(`[${new Date().toISOString()}] [job] gravando workbook com ${messages.length} mensagens`);
    await writeMailboxWorkbook(outputFile, sortMessagesDescending(messages));
    console.log(`Arquivo gerado: ${outputFile}`);
    console.log(`Notificacoes exportadas: ${messages.length}`);
  } finally {
    await client.logoff().catch(() => undefined);
  }
}

function sortMessagesDescending(messages: MailboxMessage[]): MailboxMessage[] {
  return [...messages].sort((left, right) => {
    const leftTimestamp = left.sentAt?.getTime() ?? 0;
    const rightTimestamp = right.sentAt?.getTime() ?? 0;
    return rightTimestamp - leftTimestamp;
  });
}

main().catch((error: unknown) => {
  if (error instanceof SessionConflictError) {
    console.error(error.message);
  } else if (error instanceof RequestRetriesExhaustedError) {
    console.error(`Falha de conexao apos retries: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
