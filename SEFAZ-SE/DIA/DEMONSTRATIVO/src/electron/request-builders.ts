import { resolveSefazAuthConfig } from "../../../shared/sefaz-auth";
import { parseCompetencia } from "../dates";
import type { RunConfig } from "../types";
import type { XmlDownloadConfig } from "../xml-downloads";
import type { StartRunRequest, StartXmlDownloadRequest } from "./ipc-types";

export const DEFAULT_TIMEOUT_MS = 90_000;
export const DEFAULT_XML_THREADS = 8;
export const DEFAULT_XML_TIMEOUT_MS = 90_000;
export const DEFAULT_XML_RETRY_COUNT = 2;
export const DEFAULT_XML_RETRY_DELAY_MS = 1_000;

export function buildRunConfig(request: StartRunRequest): RunConfig {
  const user = request.user.trim();
  const certPath = request.certPath.trim();
  const formats = request.formats.filter((format) => format === "pdf" || format === "xls");
  const outDir = request.outDir.trim();

  if (!user) {
    throw new Error("Informe o código do vínculo Contador.");
  }
  if (!certPath) {
    throw new Error("Selecione o certificado digital A1 (.pfx).");
  }
  if (formats.length === 0) {
    throw new Error("Selecione pelo menos um formato.");
  }
  if (!outDir) {
    throw new Error("Selecione uma pasta de saída.");
  }

  const auth = resolveSefazAuthConfig(process.env, {
    authMode: "certificate",
    certPath,
    certPassword: request.certPassword,
  });

  return {
    user,
    password: "",
    competencia: parseCompetencia(request.competencia),
    formats,
    outDir,
    checkpointEnabled: request.checkpointEnabled ?? true,
    headless: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    ...auth,
  };
}

export function buildXmlDownloadConfig(request: StartXmlDownloadRequest): XmlDownloadConfig {
  const outDir = request.outDir.trim();
  if (!outDir) {
    throw new Error("Selecione uma pasta de saída.");
  }

  return {
    competencia: parseCompetencia(request.competencia),
    outDir,
    threads: request.threads ?? DEFAULT_XML_THREADS,
    apiKey: request.siegApiKey?.trim(),
    checkpointEnabled: request.checkpointEnabled ?? true,
    timeoutMs: DEFAULT_XML_TIMEOUT_MS,
    retryCount: DEFAULT_XML_RETRY_COUNT,
    retryDelayMs: DEFAULT_XML_RETRY_DELAY_MS,
  };
}
