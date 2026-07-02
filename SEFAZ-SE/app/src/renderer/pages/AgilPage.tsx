import { AlertCircle, FileUp, PlayCircle, StopCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ProgressMonitor from "../components/ProgressMonitor";

type AuthMode = "credentials" | "certificate";

type DanfeResult = {
  danfe: string;
  status: "success" | "error" | "processing" | "pending";
  message?: string;
  pdfPath?: string;
};

type Report = {
  items: Array<{ key: string; status: string; message?: string; pdfPath?: string; updatedAt?: string }>;
  events: Array<{ timestamp: string; type: string; danfe?: string; status?: string; message?: string; pdfPath?: string }>;
};

export default function AgilPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("credentials");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [danfesText, setDanfesText] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DanfeResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [pdfPaths, setPdfPaths] = useState<string[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    window.api?.loadAgilCredentials().then((creds) => {
      if (creds) {
        setUser(creds.user);
        setPassword(creds.password);
        setRemembered(true);
      }
    }).catch(() => undefined);
  }, []);

  function addLog(message: string) {
    setLogs((prev) => [...prev, message]);
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const totalCount = results.length;
  const processedCount = results.filter((r) => r.status === "success" || r.status === "error").length;

  async function handleImportFiles() {
    try {
      const result = await window.api?.agilImportFiles();
      if (result && result.keys.length > 0) {
        setDanfesText((prev) => {
          const existing = prev.split("\n").map((l) => l.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...result.keys])];
          return merged.join("\n");
        });
        addLog(`Importados ${result.keys.length} chave(s) de ${result.filePaths.length} arquivo(s).`);
      }
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleStart() {
    setError("");
    setResults([]);
    setLogs([]);
    setReport(null);
    setPdfPaths([]);

    const danfes = danfesText
      .split(/[\n,;\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length === 44);

    if (danfes.length === 0) {
      setError("Nenhuma chave DANFE válida (44 dígitos) encontrada.");
      return;
    }

    setResults(danfes.map((d) => ({ danfe: d, status: "pending" })));
    setRunning(true);

    const cleanup = window.api?.onAgilProgress((event) => {
      const ev = event as DanfeResult;
      setResults((prev) =>
        prev.map((r) => (r.danfe === ev.danfe ? { ...r, ...ev } : r)),
      );
      addLog(`[${ev.status.toUpperCase()}] ${ev.danfe}${ev.message ? ` — ${ev.message}` : ""}`);
    });
    cleanupRef.current = cleanup ?? null;

    try {
      const auth =
        authMode === "credentials"
          ? { authMode: "credentials" as const, username: user, password }
          : { authMode: "certificate" as const };

      const batchResults = (await window.api?.agilStartBatch({ auth, danfes, dryRun })) as DanfeResult[];

      const events = batchResults.map((r) => ({
        timestamp: new Date().toISOString(),
        type: r.status,
        danfe: r.danfe,
        status: r.status,
        message: r.message,
        pdfPath: r.pdfPath,
      }));

      const reportPayload: Report = {
        items: batchResults.map((r) => ({
          key: r.danfe,
          status: r.status,
          message: r.message,
          pdfPath: r.pdfPath,
          updatedAt: new Date().toISOString(),
        })),
        events,
      };
      setReport(reportPayload);
      setPdfPaths(batchResults.map((r) => r.pdfPath).filter(Boolean) as string[]);
    } catch (err) {
      setError(String(err));
      addLog(`ERRO: ${String(err)}`);
    } finally {
      setRunning(false);
      cleanupRef.current?.();
    }
  }

  async function handleCancel() {
    await window.api?.agilCancel().catch(() => undefined);
    cleanupRef.current?.();
    setRunning(false);
    addLog("Execução cancelada.");
  }

  function handleRememberChange(checked: boolean) {
    setRemembered(checked);
    if (checked && user && password) {
      window.api?.saveAgilCredentials({ user, password }).catch(() => undefined);
    } else if (!checked) {
      window.api?.clearAgilCredentials().catch(() => undefined);
    }
  }

  async function handleExportReport() {
    if (!report) return;
    await window.api?.agilExportReport(report).catch((err) => setError(String(err)));
  }

  async function handleExportZip() {
    if (!pdfPaths.length) return;
    await window.api?.agilExportPdfsZip({ paths: pdfPaths }).catch((err) => setError(String(err)));
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">SEFAZ-SE</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-100">AGIL — Incluir Nota Fiscal</h1>
        <p className="mt-0.5 text-sm text-slate-400">Inclusão em lote de NF-e no sistema AGIL</p>
      </div>

      {error && (
        <div className="mx-8 mt-4 flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError("")} className="ml-auto shrink-0 text-red-400 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left panel — form */}
        <div className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-800 p-6">
          {/* Auth mode */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Modo de acesso</p>
            <div className="flex gap-2">
              {(["credentials", "certificate"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAuthMode(mode)}
                  disabled={running}
                  className={[
                    "flex-1 rounded-lg border py-2 text-xs font-medium transition",
                    authMode === mode
                      ? "border-blue-500 bg-blue-600/20 text-blue-300"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                  ].join(" ")}
                >
                  {mode === "credentials" ? "Login/Senha" : "Certificado"}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials */}
          {authMode === "credentials" && (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Login</span>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  disabled={running}
                  placeholder="usuário"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Senha</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={running}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={remembered}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                  disabled={running}
                />
                Lembrar credenciais
              </label>
            </div>
          )}

          {/* Chaves DANFE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chaves DANFE</p>
              <button
                type="button"
                onClick={handleImportFiles}
                disabled={running}
                className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
              >
                <FileUp size={12} />
                Importar
              </button>
            </div>
            <textarea
              value={danfesText}
              onChange={(e) => setDanfesText(e.target.value)}
              disabled={running}
              placeholder={"Cole as chaves aqui (44 dígitos cada)\n\nExemplo:\n35231234567890..."}
              rows={8}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500">
              {danfesText.split(/[\n,;\s]+/).filter((k) => k.trim().length === 44).length} chave(s) válida(s)
            </p>
          </div>

          {/* Opções */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={running}
            />
            Dry-run (não confirmar)
          </label>

          {/* Ações */}
          <div className="mt-auto flex gap-2">
            {!running ? (
              <button
                type="button"
                onClick={handleStart}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
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

          {/* Export buttons */}
          {!running && (report || pdfPaths.length > 0) && (
            <div className="flex flex-col gap-2">
              {report && (
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-700"
                >
                  Exportar relatório (.xlsx)
                </button>
              )}
              {pdfPaths.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportZip}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-700"
                >
                  Exportar PDFs (.zip)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right panel — monitor */}
        <div className="flex-1 overflow-hidden p-6">
          <ProgressMonitor
            successCount={successCount}
            errorCount={errorCount}
            totalCount={totalCount}
            current={processedCount}
            logs={logs}
            running={running}
          />
        </div>
      </div>
    </div>
  );
}
