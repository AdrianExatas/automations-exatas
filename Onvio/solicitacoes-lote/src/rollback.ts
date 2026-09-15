import fs from "node:fs";
import path from "node:path";
import { deleteTicket, OnvioApiError } from "@exatas/onvio-solicitacoes-servico";
import { parseBackupSolicitacoes } from "./backup";
import { writeRollbackReport } from "./report";

export interface RollbackOptions {
  backupPath: string;
  token: string;
  reportsDir: string;
  onLog?: (message: string) => void;
  onUnauthorized?: () => Promise<string>;
}

export async function executarReversaoBackup(options: RollbackOptions): Promise<{
  summary: { total: number; sucesso: number; falha: number };
  jsonPath: string;
  xlsxPath: string;
}> {
  const raw = JSON.parse(fs.readFileSync(options.backupPath, "utf8")) as unknown;
  const backup = parseBackupSolicitacoes(raw);
  const tokenState = { token: options.token.trim() };
  let refreshUsed = false;
  const resultados: Array<{
    ticketId: string;
    sucesso: boolean;
    mensagem: string;
    codigo?: string;
    nome?: string;
  }> = [];

  options.onLog?.(
    `Reversao: tentando apagar ${backup.items.length} solicitacao(oes) do backup ${path.basename(options.backupPath)}.`,
  );

  for (const [index, item] of backup.items.entries()) {
    const label = [item.codigo, item.nome || item.cnpj].filter(Boolean).join(" - ") || item.ticketId;
    options.onLog?.(`[${index + 1}/${backup.items.length}] Apagando ${label} (${item.ticketId})...`);
    try {
      await deleteWithRetry(item.ticketId, tokenState, options.onUnauthorized, () => {
        refreshUsed = true;
      });
      resultados.push({
        ticketId: item.ticketId,
        sucesso: true,
        mensagem: "Solicitacao apagada.",
        codigo: item.codigo,
        nome: item.nome,
      });
      options.onLog?.(`[${index + 1}/${backup.items.length}] OK ${label}`);
    } catch (error) {
      const mensagem =
        error instanceof OnvioApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      resultados.push({
        ticketId: item.ticketId,
        sucesso: false,
        mensagem,
        codigo: item.codigo,
        nome: item.nome,
      });
      options.onLog?.(`[${index + 1}/${backup.items.length}] FALHA ${label}: ${mensagem}`);
    }
  }

  if (refreshUsed) {
    options.onLog?.("Token Onvio renovado durante a reversao.");
  }

  const paths = writeRollbackReport(options.reportsDir, options.backupPath, backup, resultados);
  const summary = {
    total: resultados.length,
    sucesso: resultados.filter((item) => item.sucesso).length,
    falha: resultados.filter((item) => !item.sucesso).length,
  };
  options.onLog?.(
    `Reversao finalizada: ${summary.sucesso} apagada(s), ${summary.falha} falha(s). Relatorio: ${paths.xlsxPath}`,
  );
  return { summary, ...paths };
}

async function deleteWithRetry(
  ticketId: string,
  tokenState: { token: string },
  onUnauthorized: (() => Promise<string>) | undefined,
  onRefreshed: () => void,
): Promise<void> {
  try {
    await deleteTicket(tokenState.token, ticketId);
  } catch (error) {
    if (
      error instanceof OnvioApiError &&
      error.status === 401 &&
      onUnauthorized &&
      tokenState.token
    ) {
      const next = (await onUnauthorized()).trim();
      if (next && next !== tokenState.token) {
        tokenState.token = next;
        onRefreshed();
        await deleteTicket(tokenState.token, ticketId);
        return;
      }
    }
    throw error;
  }
}
