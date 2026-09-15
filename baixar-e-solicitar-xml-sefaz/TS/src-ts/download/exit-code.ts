import type { UploadResult } from "../types.js";

export interface DownloadExecutionResult {
  downloadErros: number;
  upload?: UploadResult;
}

export function codigoSaidaDownload(resultado: DownloadExecutionResult): number {
  if (resultado.downloadErros > 0) {
    return 1;
  }
  if (resultado.upload?.erro || (resultado.upload?.erros ?? 0) > 0) {
    return 1;
  }
  return 0;
}
