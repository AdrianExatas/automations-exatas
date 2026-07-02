import { FolderOpen } from "lucide-react";

type Mode = "file" | "directory";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode?: Mode;
  accept?: string[];
  placeholder?: string;
  disabled?: boolean;
};

export default function FilePicker({
  label,
  value,
  onChange,
  mode = "file",
  accept,
  placeholder,
  disabled,
}: Props) {
  async function browse() {
    try {
      if (mode === "directory") {
        const result = await window.api?.openDirectory();
        if (result && !result.canceled && result.filePaths[0]) {
          onChange(result.filePaths[0]);
        }
      } else {
        const result = await window.api?.openFile({
          properties: ["openFile"],
          filters: accept ? [{ name: "Arquivos", extensions: accept }] : undefined,
        });
        if (result && !result.canceled && result.filePaths[0]) {
          onChange(result.filePaths[0]);
        }
      }
    } catch {
      // ignore
    }
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? (mode === "directory" ? "C:\\caminho\\da\\pasta" : "C:\\caminho\\do\\arquivo")}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={browse}
          disabled={disabled}
          title={mode === "directory" ? "Selecionar pasta" : "Selecionar arquivo"}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-slate-100 disabled:opacity-50"
        >
          <FolderOpen size={15} />
        </button>
      </div>
    </label>
  );
}
