import { runAutomation } from "../../../SEFAZ-AL/src/automation.js";
import { toFriendlyMessage } from "../shared/messages.js";
import type { AdapterRunResult, ProgressEvent } from "../shared/types.js";

export async function runAlAdapter(options: {
  inputPath: string;
  cwd: string;
  outputDir: string;
  headed: boolean;
  log: (message: string) => void;
  shouldCancel: () => boolean;
  onProgress: (progress: ProgressEvent) => void;
}): Promise<AdapterRunResult> {
  const result = await runAutomation({
    inputPath: options.inputPath,
    cwd: options.cwd,
    outputDir: options.outputDir,
    headed: options.headed,
    browserChannel: "msedge",
    log: options.log,
    shouldCancel: options.shouldCancel,
    onProgress: (progress) => options.onProgress({ ...progress, uf: "AL" }),
  });

  return {
    uf: "AL",
    reportPath: result.reportPath,
    successCount: result.successCount,
    errorCount: result.errorCount,
    ignoredCount: result.ignoredCount,
    cancelled: result.cancelled,
    results: result.results.map((item) => ({
      uf: "AL" as const,
      rowNumber: item.rowNumber,
      identificador: item.empresa,
      empresa: item.empresa,
      detalhe: item.consolidacao ?? item.parcelamento,
      status: item.status,
      mensagem: toFriendlyMessage(item.mensagem),
      arquivo: item.arquivoSalvo,
    })),
  };
}
