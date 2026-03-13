import { useState } from 'react';
import SiegPanel from '../panels/SiegPanel';
import UnecontPanel from '../panels/UnecontPanel';
import OnvioPanel from '../panels/OnvioPanel';
import ExecutarTodas from '../panels/ExecutarTodas';
import { TABS, type TabId } from '../constants/tabs';

const PANELS: Record<TabId, React.ComponentType> = {
  sieg: SiegPanel,
  unecont: UnecontPanel,
  onvio: OnvioPanel,
};

export type { TabId };

export default function Layout() {
  const [activeTab, setActiveTab] = useState<TabId>('sieg');

  return (
    <div className="container">
      <header className="header">
        <h1>Certificado Manager</h1>
        <p className="subtitle">Gerenciador unificado de certificados digitais</p>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            data-tab={tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {TABS.map((tab) => {
          const Panel = PANELS[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <section
              key={tab.id}
              id={tab.panelId}
              className={`panel card ${isActive ? 'active' : ''}`}
              role="tabpanel"
              hidden={!isActive}
              style={isActive ? { display: 'block' } : undefined}
            >
              <Panel />
            </section>
          );
        })}
      </main>

      <section className="card executar-todas" aria-label="Executar todas as automações">
        <ExecutarTodas />
      </section>

      <footer className="footer">
        <p>
          API SIEG:{' '}
          <a href="https://api.sieg.com/swagger/ui/index" target="_blank" rel="noopener noreferrer">
            Swagger
          </a>
        </p>
      </footer>
    </div>
  );
}
