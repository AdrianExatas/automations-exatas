import { CheckCircle2, FolderOpen, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  successCount: number;
  errorCount: number;
  totalCount: number;
  current: number;
  logs: string[];
  outDir?: string;
  onOpenFolder?: () => void;
  onOpenReport?: () => void;
  running: boolean;
};

export default function ProgressMonitor({
  successCount,
  errorCount,
  totalCount,
  current,
  logs,
  outDir,
  onOpenFolder,
  onOpenReport,
  running,
}: Props) {
  const logsRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const progress = totalCount > 0 ? current / totalCount : 0;
  const done = !running && totalCount > 0 && current >= totalCount;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-slate-700 bg-slate-800/50 py-4">
          <CheckCircle2 size={20} className="mb-1 text-emerald-400" />
          <span className="text-2xl font-bold text-emerald-400">{successCount}</span>
          <span className="text-xs text-slate-400">sucessos</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-slate-700 bg-slate-800/50 py-4">
          <XCircle size={20} className="mb-1 text-red-400" />
          <span className="text-2xl font-bold text-red-400">{errorCount}</span>
          <span className="text-xs text-slate-400">erros</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-slate-700 bg-slate-800/50 py-4">
          <span className="mb-1 text-lg text-slate-400">#</span>
          <span className="text-2xl font-bold text-slate-200">{totalCount}</span>
          <span className="text-xs text-slate-400">total</span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{running ? "Processando..." : done ? "Concluído" : "Aguardando"}</span>
          <span>
            {current} / {totalCount}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={[
              "h-full rounded-full transition-all duration-300",
              done && errorCount === 0
                ? "bg-emerald-500"
                : done && errorCount > 0
                  ? "bg-amber-500"
                  : "bg-blue-500",
            ].join(" ")}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Log */}
      <pre
        ref={logsRef}
        className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300"
      >
        {logs.length > 0 ? logs.join("\n") : <span className="text-slate-600">Aguardando execução...</span>}
      </pre>

      {/* Ações pós-execução */}
      {done && (
        <div className="flex gap-2">
          {onOpenFolder && outDir && (
            <button
              type="button"
              onClick={onOpenFolder}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              <FolderOpen size={14} />
              Abrir pasta
            </button>
          )}
          {onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Abrir relatório
            </button>
          )}
        </div>
      )}
    </div>
  );
}
