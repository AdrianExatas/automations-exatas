import { runAutomation } from "../../../SEFAZ-SE/src/automation.js";
import { toFriendlyMessage } from "../shared/messages.js";
import type { AdapterRunResult, ProgressEvent } from "../shared/types.js";

export async function runSeAdapter(options: {
  inputPath: string;
  cwd: string;
  headed: boolean;
  log: (message: string) => void;
  shouldCancel: () => boolean;
  onProgress: (progress: ProgressEvent) => void;
}): Promise<AdapterRunResult> {
  const result = await runAutomation({
    inputPath: options.inputPath,
    cwd: options.cwd,
    headed: options.headed,
    browserChannel: "msedge",
    transport: "browser",
    log: options.log,
    shouldCancel: options.shouldCancel,
    onProgress: (progress) => options.onProgress({ ...progress, uf: "SE" }),
  });

  return {
    uf: "SE",
    reportPath: result.reportPath,
    successCount: result.successCount,
    errorCount: result.errorCount,
    ignoredCount: result.ignoredCount,
    cancelled: Boolean(result.cancelled),
    results: (result.results ?? []).map((item) => ({
      uf: "SE" as const,
      rowNumber: item.rowNumber,
      identificador: item.codigo,
      empresa: item.empresa,
      cnpj: item.cnpj,
      detalhe: [item.protocolo, item.parcelLabel, item.vencimento].filter(Boolean).join(" · "),
      status: item.status,
      mensagem: toFriendlyMessage(item.mensagem),
      arquivo: item.pdfPath,
    })),
  };
}
