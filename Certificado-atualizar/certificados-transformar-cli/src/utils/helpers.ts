import fs from "fs";
import path from "path";

export function normalizarCnpj(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function extractErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: unknown }; message?: string };
  if (axiosErr.response?.data != null) {
    const d = axiosErr.response.data;
    if (typeof d === "string") return d;
    if (typeof d === "object") {
      const obj = d as Record<string, unknown>;
      if (typeof obj.message === "string") return obj.message;
      if (typeof obj.Mensagem === "string") return obj.Mensagem;
      if (typeof obj.error === "string") return obj.error;
      return JSON.stringify(d);
    }
  }
  return axiosErr.message ?? "Erro desconhecido";
}

/** Indica se o erro é de token/sessão Onvio inválida (401 ou mensagem de sessão não encontrada). */
export function isOnvioTokenInvalidError(err: unknown): boolean {
  const axiosErr = err as { response?: { status?: number }; message?: string };
  if (axiosErr.response?.status === 401) return true;
  const msg = extractErrorMessage(err);
  const lower = msg.toLowerCase();
  if (msg.includes("401") && (lower.includes("session") || lower.includes("token"))) return true;
  return (
    lower.includes("session") &&
    (lower.includes("not found") || lower.includes("inválid") || lower.includes("invalid"))
  );
}

export function validateRequiredEnv(vars: Record<string, string | undefined>): void {
  const missing = Object.entries(vars)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias não definidas: ${missing.join(", ")}`);
  }
}

export function readPfxFile(pfxPath: string): { buffer: Buffer; filename: string } {
  const resolvedPfx = path.resolve(pfxPath);
  if (!fs.existsSync(resolvedPfx)) {
    throw new Error(`Arquivo não encontrado: ${resolvedPfx}`);
  }
  return {
    buffer: fs.readFileSync(resolvedPfx),
    filename: path.basename(resolvedPfx),
  };
}
