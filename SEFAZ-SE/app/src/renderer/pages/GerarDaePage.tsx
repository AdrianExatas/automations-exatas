import { AlertCircle, PlayCircle, StopCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import CredentialsCard from "../components/CredentialsCard";
import FilePicker from "../components/FilePicker";
import ProgressMonitor from "../components/ProgressMonitor";

type Resultado = {
  contribuinte: string;
  razaoSocial: string;
  status: "ok" | "erro";
  arquivo?: string;
  erro?: string;
};

export default function GerarDaePage() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [modelDir, setModelDir] = useState("");
  const [outDir, setOutDir] = useState("");
  const [headless, setHeadless] = useState(true);
  const [useCustomRef, setUseCustomRef] = useState(false);
  const [refAno, setRefAno] = useState(String(new Date().getFullYear()));
  const [refMes, setRefMes] = useState(String(new Date().getMonth() + 1));

  const [running, setRunning] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const cleanupRef = useRef<(() => void) | null>(null);

  const successCount = resultados.filter((r) => r.status === "ok").length;
  const errorCount = resultados.filter((r) => r.status === "erro").length;
  const totalCount = resultados.length;

  function addLog(message: string) {
    setLogs((prev) => [...prev, message]);
  }

  async function handleStart() {
    setError("");
    setResultados([]);
    setLogs([]);
    setRunning(true);

    const cleanup = window.api?.onDaeProgress((result) => {
      const r = result as Resultado;
      setResultados((prev) => {
        const idx = prev.findIndex((x) => x.contribuinte === r.contribuinte);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = r;
          return next;
        }
        return [...prev, r];
      });
      addLog(
        r.status === "ok"
          ? `✓ ${r.contribuinte} — ${r.razaoSocial}`
          : `✗ ${r.contribuinte} — ${r.erro}`,
      );
    });
    cleanupRef.current = cleanup ?? null;

    try {
      await window.api?.daeStart({
        user,
        password,
        modelDir,
        outDir,
        headless,
        referencia: useCustomRef
          ? { ano: Number(refAno), mes: Number(refMes) }
          : undefined,
      });
    } catch (err) {
      setError(String(err));
      addLog(`ERRO: ${String(err)}`);
    } finally {
      setRunning(false);
      cleanupRef.current?.();
    }
  }

  async function handleCancel() {
    await window.api?.daeCancel().catch(() => undefined);
    cleanupRef.current?.();
    setRunning(false);
    addLog("Execução cancelada.");
  }

  function handleOpenFolder() {
    if (outDir) window.api?.openPath(outDir).catch(() => undefined);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">DIA</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-100">Gerar DAE</h1>
        <p className="mt-0.5 text-sm text-slate-400">Geração automática de DAEs por planilha de contribuintes</p>
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
            <FilePicker
              label="Pasta de modelos (planilhas)"
              value={modelDir}
              onChange={setModelDir}
              mode="directory"
              disabled={running}
            />
            <FilePicker
              label="Pasta de saída (PDFs)"
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
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={useCustomRef}
                onChange={(e) => setUseCustomRef(e.target.checked)}
                disabled={running}
              />
              Definir competência manualmente
            </label>
            {useCustomRef && (
              <div className="flex gap-2">
                <label className="block flex-1">
                  <span className="mb-1 block text-xs text-slate-400">Mês</span>
                  <select
                    value={refMes}
                    onChange={(e) => setRefMes(e.target.value)}
                    disabled={running}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block flex-1">
                  <span className="mb-1 block text-xs text-slate-400">Ano</span>
                  <input
                    type="number"
                    value={refAno}
                    onChange={(e) => setRefAno(e.target.value)}
                    disabled={running}
                    min={2000}
                    max={2099}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            )}
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
            successCount={successCount}
            errorCount={errorCount}
            totalCount={totalCount}
            current={successCount + errorCount}
            logs={logs}
            outDir={outDir}
            onOpenFolder={handleOpenFolder}
            running={running}
          />
        </div>
      </div>
    </div>
  );
}
