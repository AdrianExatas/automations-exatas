import { sendServiceRequestsBatch } from "../send-service-requests-batch";
import type {
  ServiceRequestAttachmentStrategy,
  ServiceRequestBatchItemResult,
  ServiceRequestMode,
} from "../types";

interface SendCliFlags {
  excelPath?: string;
  token?: string;
  attachmentsDir?: string;
  mode: ServiceRequestMode;
  dryRun: boolean;
  bdApiBaseUrl?: string;
  defaultClientId?: string;
  defaultDepartmentId?: string;
  defaultRequesterId?: string;
  attachmentStrategy: ServiceRequestAttachmentStrategy;
  help: boolean;
}

function printUsage(): void {
  console.log(
    [
      "Uso:",
      "  bun run --cwd shared/onvio-solicitacoes-servico send -- --excel <arquivo> [opcoes]",
      "",
      "Opcoes:",
      "  --token <token>",
      "  --excel <arquivo>",
      "  --attachments-dir <pasta>",
      "  --mode attachments|no-attachments",
      "  --attachment-strategy explicit|code-fallback",
      "  --dry-run",
      "  --bd-api-base-url <url>",
      "  --default-client-id <id>",
      "  --default-department-id <id>",
      "  --default-requester-id <id>",
      "",
      "Variaveis de ambiente aceitas:",
      "  ONVIO_UDS_TOKEN, BD_API_BASE_URL, ONVIO_CLIENT_ID, ONVIO_DEPARTMENT_ID, ONVIO_REQUESTER_ID",
    ].join("\n"),
  );
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Valor ausente para ${flag}.`);
  }
  return value;
}

function parseMode(value: string): ServiceRequestMode {
  if (value === "attachments" || value === "no-attachments") {
    return value;
  }

  throw new Error(`Modo invalido: ${value}. Use attachments ou no-attachments.`);
}

function parseAttachmentStrategy(value: string): ServiceRequestAttachmentStrategy {
  if (value === "explicit" || value === "code-fallback") {
    return value;
  }

  throw new Error(
    `Estrategia de anexos invalida: ${value}. Use explicit ou code-fallback.`,
  );
}

function parseSendCliArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): SendCliFlags {
  const args = argv[0] === "send" ? argv.slice(1) : argv;
  const flags: SendCliFlags = {
    token: env.ONVIO_UDS_TOKEN,
    excelPath: env.EMPRESAS_EXCEL_PATH,
    attachmentsDir: env.ONVIO_ATTACHMENTS_DIR,
    mode: "attachments",
    dryRun: false,
    bdApiBaseUrl: env.BD_API_BASE_URL,
    defaultClientId: env.ONVIO_CLIENT_ID,
    defaultDepartmentId: env.ONVIO_DEPARTMENT_ID,
    defaultRequesterId: env.ONVIO_REQUESTER_ID,
    attachmentStrategy: "explicit",
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--help":
      case "-h":
        flags.help = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--excel":
        flags.excelPath = readFlagValue(args, index, arg);
        index += 1;
        break;
      case "--token":
        flags.token = readFlagValue(args, index, arg);
        index += 1;
        break;
      case "--attachments-dir":
        flags.attachmentsDir = readFlagValue(args, index, arg);
        index += 1;
        break;
      case "--mode":
        flags.mode = parseMode(readFlagValue(args, index, arg));
        index += 1;
        break;
      case "--attachment-strategy":
        flags.attachmentStrategy = parseAttachmentStrategy(readFlagValue(args, index, arg));
        index += 1;
        break;
      case "--bd-api-base-url":
        flags.bdApiBaseUrl = readFlagValue(args, index, arg);
        index += 1;
        break;
      case "--default-client-id":
        flags.defaultClientId = readFlagValue(args, index, arg);
        index += 1;
        break;
      case "--default-department-id":
        flags.defaultDepartmentId = readFlagValue(args, index, arg);
        index += 1;
        break;
      case "--default-requester-id":
        flags.defaultRequesterId = readFlagValue(args, index, arg);
        index += 1;
        break;
      default:
        throw new Error(`Argumento nao reconhecido: ${arg}`);
    }
  }

  return flags;
}

function formatServiceRequestLabel(item: ServiceRequestBatchItemResult): string {
  const { serviceRequest } = item;
  return [serviceRequest.codigo, serviceRequest.nome || serviceRequest.cnpj].filter(Boolean).join(" - ");
}

export async function main(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  try {
    const flags = parseSendCliArgs(argv, env);

    if (flags.help) {
      printUsage();
      return 0;
    }

    if (!flags.excelPath?.trim()) {
      console.error("Informe --excel <arquivo>.");
      return 1;
    }

    if (flags.mode === "attachments" && !flags.attachmentsDir?.trim()) {
      console.error("Informe --attachments-dir <pasta> quando --mode=attachments.");
      return 1;
    }

    if (!flags.dryRun && !flags.token?.trim()) {
      console.error("Informe --token <token> ou configure ONVIO_UDS_TOKEN.");
      return 1;
    }

    const result = await sendServiceRequestsBatch({
      token: flags.token?.trim() ?? "",
      input: { excelPath: flags.excelPath },
      attachmentsDir: flags.attachmentsDir,
      mode: flags.mode,
      dryRun: flags.dryRun,
      attachmentStrategy: flags.attachmentStrategy,
      bdApiBaseUrl: flags.bdApiBaseUrl,
      defaults: {
        clientId: flags.defaultClientId,
        departmentId: flags.defaultDepartmentId,
        requesterId: flags.defaultRequesterId,
      },
    });

    for (const warning of result.warnings) {
      console.warn(`[AVISO] ${warning}`);
    }

    for (const item of result.items) {
      const label = formatServiceRequestLabel(item);
      const prefix =
        item.status === "failed" ? "[ERRO]" : item.status === "success" ? "[OK]" : "[PREVIEW]";
      console.log(`${prefix} ${label}: ${item.message ?? "Processado."}`);

      for (const warning of item.warnings ?? []) {
        console.warn(`[AVISO] ${label}: ${warning}`);
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
