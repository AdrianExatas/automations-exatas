import { BarChart2, FileEdit, FileText, Home, Receipt } from "lucide-react";
import { useEffect, useState } from "react";

export type ModuleId = "home" | "agil" | "gerar-dae" | "alterar-nota" | "demonstrativo";

type NavItem = {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Início", icon: <Home size={18} />, description: "" },
  {
    id: "agil",
    label: "AGIL",
    icon: <Receipt size={18} />,
    description: "Incluir NF-e em lote",
  },
  {
    id: "gerar-dae",
    label: "Gerar DAE",
    icon: <FileText size={18} />,
    description: "Gerar DAEs por planilha",
  },
  {
    id: "alterar-nota",
    label: "Alterar Nota",
    icon: <FileEdit size={18} />,
    description: "Alterar NF - DIA Atual",
  },
  {
    id: "demonstrativo",
    label: "Demonstrativo",
    icon: <BarChart2 size={18} />,
    description: "Baixar demonstrativos DIA",
  },
];

type Props = {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
};

export default function Sidebar({ active, onSelect }: Props) {
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.api?.getVersion().then(setVersion).catch(() => undefined);
  }, []);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          SE
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">SEFAZ-SE</p>
          <p className="text-xs text-slate-400">Automações</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
              ].join(" ")}
            >
              <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {version && (
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-xs text-slate-500">v{version}</p>
        </div>
      )}
    </aside>
  );
}
