import { runAutomation } from "../../../SEFAZ-PI/src/automation.js";
import { toFriendlyMessage } from "../shared/messages.js";
import type { AdapterRunResult, ProgressEvent } from "../shared/types.js";

export async function runPiAdapter(options: {
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
    log: options.log,
    shouldCancel: options.shouldCancel,
    onProgress: (progress) => options.onProgress({ ...progress, uf: "PI" }),
  });

  return {
    uf: "PI",
    reportPath: result.reportPath,
    successCount: result.successCount,
    errorCount: result.errorCount,
    ignoredCount: result.ignoredCount,
    cancelled: result.cancelled,
    results: result.results.map((item) => ({
      uf: "PI" as const,
      rowNumber: item.rowNumber,
      identificador: item.codigo,
      empresa: item.empresa,
      cnpj: item.cnpj,
      detalhe: [item.numeroParcelamento, item.parcela, item.vencimento].filter(Boolean).join(" · "),
      status: item.status,
      mensagem: toFriendlyMessage(item.mensagem),
      arquivo: item.pdfPath,
    })),
  };
}
