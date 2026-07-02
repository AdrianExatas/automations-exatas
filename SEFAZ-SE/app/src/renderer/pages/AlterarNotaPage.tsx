import { AlertCircle, PlayCircle, StopCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import CredentialsCard from "../components/CredentialsCard";
import FilePicker from "../components/FilePicker";
import ProgressMonitor from "../components/ProgressMonitor";

type RunProgress = {
  phase: string;
  current: number;
  total: number;
  message: string;
  successCount: number;
  errorCount: number;
  processedCount: number;
  outDir: string;
  jsonPath: string;
  excelPath: string;
};

export default function AlterarNotaPage() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [spreadsheetPath, setSpreadsheetPath] = useState("");
  const [outDir, setOutDir] = useState("");
  const [headless, setHeadless] = useState(true);
  const [dryRun, setDryRun] = useState(false);

  const [running, setRunning] = useState(false);
  const [lastProgress, setLastProgress] = useState<RunProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [excelPath, setExcelPath] = useState("");
  const cleanupProgressRef = useRef<(() => void) | null>(null);
  const cleanupLogRef = useRef<(() => void) | null>(null);

  function addLog(message: string) {
    setLogs((prev) => [...prev, message]);
  }

  async function handleStart() {
    setError("");
    setLogs([]);
    setLastProgress(null);
    setExcelPath("");
    setRunning(true);

    const cleanupProgress = window.api?.onAlterarNotaProgress((progress) => {
      const p = progress as RunProgress;
      setLastProgress(p);
    });
    const cleanupLog = window.api?.onAlterarNotaLog((message) => {
      addLog(message as string);
    });
    cleanupProgressRef.current = cleanupProgress ?? null;
    cleanupLogRef.current = cleanupLog ?? null;

    try {
      const result = (await window.api?.alterarNotaStart({
        user,
        password,
        spreadsheetPath,
        outDir,
        headless,
        dryRun,
      })) as { excelPath?: string };

      if (result?.excelPath) setExcelPath(result.excelPath);
    } catch (err) {
      setError(String(err));
      addLog(`ERRO: ${String(err)}`);
    } finally {
      setRunning(false);
      cleanupProgressRef.current?.();
      cleanupLogRef.current?.();
    }
  }

  async function handleCancel() {
    await window.api?.alterarNotaCancel().catch(() => undefined);
    cleanupProgressRef.current?.();
    cleanupLogRef.current?.();
    setRunning(false);
    addLog("Execução cancelada.");
  }

  function handleOpenFolder() {
    const dir = lastProgress?.outDir || outDir;
    if (dir) window.api?.openPath(dir).catch(() => undefined);
  }

  function handleOpenReport() {
    if (excelPath) window.api?.openPath(excelPath).catch(() => undefined);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">DIA Atual</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-100">Alterar Nota Fiscal</h1>
        <p className="mt-0.5 text-sm text-slate-400">Processamento em lote via planilha colorida</p>
      </div>

      {error && (
        <div className="mx-8 mt-4 flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Form */}
        <div className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-800 p-6">
          <CredentialsCard
            storeKey="sefaz"
            user={user}
            password={password}
            onUserChange={setUser}
            onPasswordChange={setPassword}
            disabled={running}
          />

          <div className="border-t border-slate-800" />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Execução</p>
            <FilePicker
              label="Planilha de notas fiscais"
              value={spreadsheetPath}
              onChange={setSpreadsheetPath}
              mode="file"
              accept={["xlsx", "xls"]}
              disabled={running}
            />
            <FilePicker
              label="Pasta de saída (relatórios)"
              value={outDir}
              onChange={setOutDir}
              mode="directory"
              disabled={running}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
                disabled={running}
              />
              Executar em segundo plano
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                disabled={running}
              />
              Dry-run (não confirmar OK final)
            </label>
          </div>

          <div className="mt-auto flex gap-2">
            {!running ? (
              <button
                type="button"
                onClick={handleStart}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <PlayCircle size={16} />
                Iniciar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
              >
                <StopCircle size={16} />
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Monitor */}
        <div className="flex-1 overflow-hidden p-6">
          <ProgressMonitor
            successCount={lastProgress?.successCount ?? 0}
            errorCount={lastProgress?.errorCount ?? 0}
            totalCount={lastProgress?.total ?? 0}
            current={lastProgress?.current ?? 0}
            logs={logs}
            outDir={lastProgress?.outDir || outDir}
            onOpenFolder={handleOpenFolder}
            onOpenReport={excelPath ? handleOpenReport : undefined}
            running={running}
          />
        </div>
      </div>
    </div>
  );
}
