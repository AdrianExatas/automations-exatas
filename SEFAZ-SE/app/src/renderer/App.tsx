import { useState } from "react";
import Sidebar, { type ModuleId } from "./components/Sidebar";
import AgilPage from "./pages/AgilPage";
import AlterarNotaPage from "./pages/AlterarNotaPage";
import DemonstrativoPage from "./pages/DemonstrativoPage";
import GerarDaePage from "./pages/GerarDaePage";
import HomePage from "./pages/HomePage";

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("home");

  const page = {
    home: <HomePage onNavigate={setActiveModule} />,
    agil: <AgilPage />,
    "gerar-dae": <GerarDaePage />,
    "alterar-nota": <AlterarNotaPage />,
    demonstrativo: <DemonstrativoPage />,
  }[activeModule];

  return (
    <div className="flex h-full bg-slate-950">
      <Sidebar active={activeModule} onSelect={setActiveModule} />
      <main className="flex-1 overflow-y-auto">{page}</main>
    </div>
  );
}
