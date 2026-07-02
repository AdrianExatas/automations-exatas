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

function previousMonthValue(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  if (month === 0) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default function DemonstrativoPage() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [competencia, setCompetencia] = useState(previousMonthValue());
  const [formatPdf, setFormatPdf] = useState(true);
  const [formatXls, setFormatXls] = useState(true);
  const [outDir, setOutDir] = useState("");

  const [running, setRunning] = useState(false);
  const [lastProgress, setLastProgress] = useState<RunProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [excelPath, setExcelPath] = useState("");
  const cleanupProgressRef = useRef<(() => void) | null>(null);
  const cleanupLogRef = useRef<(() => void) | null>(null);

  async function handleStart() {
    setError("");
    setLogs([]);
    setLastProgress(null);
    setExcelPath("");

    const formats: string[] = [];
    if (formatPdf) formats.push("pdf");
    if (formatXls) formats.push("xls");

    if (!formats.length) {
      setError("Selecione ao menos um formato (PDF ou XLS).");
      return;
    }

    setRunning(true);

    const cleanupProgress = window.api?.onDemonstrativoProgress((progress) => {
      const p = progress as RunProgress;
      setLastProgress(p);
    });
    const cleanupLog = window.api?.onDemonstrativoLog((message) => {
      setLogs((prev) => [...prev, message as string]);
    });
    cleanupProgressRef.current = cleanupProgress ?? null;
    cleanupLogRef.current = cleanupLog ?? null;

    try {
      const result = (await window.api?.demonstrativoStart({
        user,
        password,
        competencia,
        formats,
        outDir,
      })) as { excelPath?: string };

      if (result?.excelPath) setExcelPath(result.excelPath);
    } catch (err) {
      setError(String(err));
      setLogs((prev) => [...prev, `ERRO: ${String(err)}`]);
    } finally {
      setRunning(false);
      cleanupProgressRef.current?.();
      cleanupLogRef.current?.();
    }
  }

  async function handleCancel() {
    await window.api?.demonstrativoCancel().catch(() => undefined);
    cleanupProgressRef.current?.();
    cleanupLogRef.current?.();
    setRunning(false);
    setLogs((prev) => [...prev, "Execução cancelada."]);
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
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">DIA</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-100">Demonstrativo</h1>
        <p className="mt-0.5 text-sm text-slate-400">Download de demonstrativos DIA em PDF e XLS</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Configuração</p>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Competência</span>
              <input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                disabled={running}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 [color-scheme:dark]"
              />
            </label>

            <div className="space-y-2">
              <span className="block text-xs text-slate-400">Formatos</span>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={formatPdf}
                    onChange={(e) => setFormatPdf(e.target.checked)}
                    disabled={running}
                  />
                  PDF
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={formatXls}
                    onChange={(e) => setFormatXls(e.target.checked)}
                    disabled={running}
                  />
                  XLS
                </label>
              </div>
            </div>

            <FilePicker
              label="Pasta de saída"
              value={outDir}
              onChange={setOutDir}
              mode="directory"
              disabled={running}
            />
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
