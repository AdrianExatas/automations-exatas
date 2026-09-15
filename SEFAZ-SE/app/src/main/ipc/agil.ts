import {
  type AgilAuthOptions,
  type DanfeProgressEvent,
  type DanfeResult,
  type ExecutionReportPayload,
  extractDanfeKeysFromFile,
  incluirNotasFiscaisAgil,
  writeExecutionReport,
} from "@sefaz/core";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import archiver from "archiver";
import { chromium } from "playwright";

type StartBatchPayload = {
  auth?: AgilAuthOptions;
  danfes: string[];
  dryRun?: boolean;
};

let running = false;

function resolveAgilPdfDownloadDir(): string {
  return join(app.getPath("documents"), "SEFAZ-SE", "agil-pdfs");
}

function isPdfPathAllowed(filePath: string, allowedRoot: string): boolean {
  const resolvedFile = resolve(filePath);
  const resolvedRoot = resolve(allowedRoot);
  if (!resolvedFile.toLowerCase().endsWith(".pdf")) return false;
  const rel = relative(resolvedRoot, resolvedFile);
  return Boolean(rel && !rel.startsWith("..") && !isAbsolute(rel));
}

function timestampForFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function registerAgilHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle("agil:import-files", async () => {
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, {
          title: "Importar chaves de notas fiscais",
          properties: ["openFile", "multiSelections"],
          filters: [
            { name: "Planilhas e textos", extensions: ["xls", "xlsx", "csv", "txt"] },
            { name: "Todos os arquivos", extensions: ["*"] },
          ],
        })
      : await dialog.showOpenDialog({
          title: "Importar chaves de notas fiscais",
          properties: ["openFile", "multiSelections"],
          filters: [{ name: "Planilhas e textos", extensions: ["xls", "xlsx", "csv", "txt"] }],
        });

    if (result.canceled) return { filePaths: [], keys: [] };

    const keys = new Set<string>();
    for (const filePath of result.filePaths) {
      for (const key of extractDanfeKeysFromFile(filePath)) {
        keys.add(key);
      }
    }

    return { filePaths: result.filePaths, keys: [...keys] };
  });

  ipcMain.handle("agil:export-report", async (_e, payload: ExecutionReportPayload) => {
    if (payload.items.length === 0 && payload.events.length === 0) {
      throw new Error("Nao ha dados para exportar.");
    }

    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, {
          title: "Baixar relatorio de execucao",
          defaultPath: `relatorio-agil-${timestampForFileName()}.xlsx`,
          filters: [{ name: "Planilha Excel", extensions: ["xlsx"] }],
        })
      : await dialog.showSaveDialog({
          title: "Baixar relatorio de execucao",
          defaultPath: `relatorio-agil-${timestampForFileName()}.xlsx`,
          filters: [{ name: "Planilha Excel", extensions: ["xlsx"] }],
        });

    if (result.canceled || !result.filePath) return { canceled: true };

    writeExecutionReport(result.filePath, payload);
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("agil:export-pdfs-zip", async (_e, payload: { paths: string[] }) => {
    const rawPaths = [...new Set((payload.paths ?? []).map((p) => p.trim()).filter(Boolean))];
    if (rawPaths.length === 0) throw new Error("Nenhum PDF para exportar.");

    const allowedRoot = resolveAgilPdfDownloadDir();
    const entries: { abs: string; nameInZip: string }[] = [];
    const usedNames = new Set<string>();

    for (const p of rawPaths) {
      if (!isPdfPathAllowed(p, allowedRoot)) {
        throw new Error(`Caminho nao permitido ou nao e PDF: ${p}`);
      }
      const abs = resolve(p);
      try {
        const st = await stat(abs);
        if (!st.isFile()) throw new Error(`Nao e arquivo: ${p}`);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Nao e arquivo")) throw error;
        throw new Error(`Arquivo nao encontrado: ${p}`);
      }
      let nameInZip = basename(abs);
      if (usedNames.has(nameInZip)) {
        nameInZip = `${basename(dirname(abs))}_${nameInZip}`;
      }
      let candidate = nameInZip;
      let suffix = 0;
      while (usedNames.has(candidate)) {
        suffix += 1;
        candidate = `${suffix}_${nameInZip}`;
      }
      usedNames.add(candidate);
      entries.push({ abs, nameInZip: candidate });
    }

    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, {
          title: "Salvar comprovantes em ZIP",
          defaultPath: `comprovantes-agil-${timestampForFileName()}.zip`,
          filters: [{ name: "Arquivo ZIP", extensions: ["zip"] }],
        })
      : await dialog.showSaveDialog({
          title: "Salvar comprovantes em ZIP",
          defaultPath: `comprovantes-agil-${timestampForFileName()}.zip`,
          filters: [{ name: "Arquivo ZIP", extensions: ["zip"] }],
        });

    if (result.canceled || !result.filePath) return { canceled: true };

    const output = createWriteStream(result.filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const done = new Promise<void>((res, rej) => {
      output.once("error", rej);
      output.once("close", res);
      archive.once("error", rej);
    });
    archive.pipe(output);
    for (const { abs, nameInZip } of entries) archive.file(abs, { name: nameInZip });
    await archive.finalize();
    await done;

    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("agil:start-batch", async (event, payload: StartBatchPayload) => {
    if (running) throw new Error("Ja existe uma execucao em andamento.");

    if (!Array.isArray(payload?.danfes)) {
      throw new Error("Payload do lote AGIL invalido: lista de chaves ausente. Reinicie o aplicativo.");
    }

    const danfes = [
      ...new Set(payload.danfes.map((d) => d.trim()).filter(Boolean)),
    ];
    if (danfes.length === 0) throw new Error("Informe ao menos uma chave de nota fiscal.");

    running = true;
    const dryRun = Boolean(payload.dryRun);
    const browserChannel = process.env.BROWSER_CHANNEL?.trim() || "msedge";
    const browser = await chromium.launch({
      headless: false,
      slowMo: dryRun ? 1200 : 0,
      args: ["--start-maximized"],
      channel: browserChannel,
    });

    try {
      const context = await browser.newContext({
        acceptDownloads: true,
        viewport: null,
      });
      const page = await context.newPage();
      const pdfDownloadDir = resolveAgilPdfDownloadDir();

      const results: DanfeResult[] = await incluirNotasFiscaisAgil(page, {
        ...payload.auth,
        danfes,
        dryRun,
        pdfDownloadDir,
        onProgress: (progress: DanfeProgressEvent) => {
          event.sender.send("agil:progress", progress);
        },
      });

      return results;
    } finally {
      running = false;
      await browser.close();
    }
  });

  ipcMain.handle("agil:cancel", () => {
    // Cancellation handled via AbortController in future; for now surfaces error from batch
    running = false;
  });
}
