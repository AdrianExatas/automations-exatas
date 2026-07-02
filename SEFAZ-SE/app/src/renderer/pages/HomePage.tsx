import { BarChart2, FileEdit, FileText, Receipt } from "lucide-react";
import type { ModuleId } from "../components/Sidebar";

type ModuleCard = {
  id: ModuleId;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  badge?: string;
};

const MODULES: ModuleCard[] = [
  {
    id: "agil",
    icon: <Receipt size={24} />,
    title: "AGIL",
    description:
      "Inclua chaves DANFE em lote no sistema AGIL da SEFAZ-SE. Importe via planilha ou cole as chaves diretamente.",
    color: "from-blue-600/20 to-blue-600/5 border-blue-600/30 hover:border-blue-500/60",
    badge: "NF-e",
  },
  {
    id: "gerar-dae",
    icon: <FileText size={24} />,
    title: "Gerar DAE",
    description:
      "Gere DAEs automaticamente para cada contribuinte da sua pasta de modelos via portal DIA da SEFAZ-SE.",
    color: "from-violet-600/20 to-violet-600/5 border-violet-600/30 hover:border-violet-500/60",
    badge: "DIA",
  },
  {
    id: "alterar-nota",
    icon: <FileEdit size={24} />,
    title: "Alterar Nota Fiscal",
    description:
      "Processe notas fiscais em lote a partir de planilha colorida, alterando ICMS e forma de recolhimento no DIA Atual.",
    color: "from-amber-600/20 to-amber-600/5 border-amber-600/30 hover:border-amber-500/60",
    badge: "DIA Atual",
  },
  {
    id: "demonstrativo",
    icon: <BarChart2 size={24} />,
    title: "Demonstrativo",
    description:
      "Baixe demonstrativos DIA de todas as empresas em PDF e/ou XLS para uma competência específica.",
    color: "from-emerald-600/20 to-emerald-600/5 border-emerald-600/30 hover:border-emerald-500/60",
    badge: "DIA",
  },
];

type Props = {
  onNavigate: (id: ModuleId) => void;
};

export default function HomePage({ onNavigate }: Props) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">SEFAZ-SE</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-100">Automações</h1>
        <p className="mt-1 text-sm text-slate-400">
          Selecione um módulo para começar
        </p>
      </div>

      {/* Cards grid */}
      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 gap-5">
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => onNavigate(mod.id)}
              className={[
                "group relative flex flex-col gap-4 rounded-2xl border bg-gradient-to-br p-6 text-left transition-all duration-200",
                mod.color,
              ].join(" ")}
            >
              {mod.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-slate-700/80 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                  {mod.badge}
                </span>
              )}
              <div className="text-slate-300 transition-colors group-hover:text-white">
                {mod.icon}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">{mod.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{mod.description}</p>
              </div>
              <div className="mt-auto text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
                Abrir →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
