# Portal de Apuração de ICMS — Frontend

Frontend do portal web de apuração de ICMS (dashboard de portfólio, detalhe por empresa/competência,
Gates, status do workflow e pendências), para uso interno do setor fiscal.

Stack: **Vite + React 19 + TypeScript + Tailwind CSS**, com `react-router-dom` (roteamento),
`@tanstack/react-query` (data fetching/cache) e `recharts` (gráficos, usados a partir da fase de
implementação de dados reais).

> Este é apenas o **esqueleto** do app: rotas, layout, componentes de UI e cliente de API já
> modelados conforme o contrato do backend — as páginas exibem estrutura visual final, mas com
> dados reais/ações de escrita (liberar Gate, avançar status, CRUD de pendências) ainda **não
> implementados**. Isso é feito em uma fase seguinte.

## Como rodar

```powershell
npm install
npm run dev
```

Abre em **http://localhost:5173**. O Vite faz proxy de `/api/*` para `http://127.0.0.1:8001`
(backend FastAPI em `apuracao-ICMS/portal/backend/`) — ver `vite.config.ts`. Se o backend não
estiver no ar, as páginas mostram estados de carregamento e depois um estado de erro com opção de
"Tentar novamente" (não há crash).

Outros comandos:

```powershell
npm run build     # build de produção (checagem de tipos + bundle em dist/)
npm run preview    # servir o build de produção localmente
npm run lint       # oxlint
```

## Estrutura

```
src/
├── main.tsx, App.tsx        # bootstrap (QueryClientProvider + BrowserRouter) e rotas
├── api/
│   ├── client.ts             # wrapper axios, baseURL "/api", funções por recurso
│   └── types.ts              # tipos TS do contrato REST do backend
├── constants/
│   └── status.ts             # os 19 status do workflow (mapa-macro-processo.md)
├── lib/
│   └── format.ts             # formatação BRL (Intl pt-BR), datas, CNPJ, competência
├── components/
│   ├── layout/                # Sidebar, Topbar (breadcrumb + usuário mock), AppLayout, PageContainer
│   └── ui/                    # Badge, GateBadge, SeverityBadge, StatusBadge, KpiCard, Card,
│                               # Table genérica, Tabs, StatusStepper, Loading/ErrorState
└── pages/
    ├── DashboardPage.tsx              # "/" — grid de KPIs de portfólio + tabela de empresas
    ├── EmpresaCompetenciaPage.tsx     # "/empresas/:cnpj/:competencia" — abas (Visão geral, Gates,
    │                                   Módulos, Pendências, Documentos)
    ├── PendenciasPage.tsx             # "/pendencias" — filtros + visão Tabela/Kanban
    └── LoginPage.tsx                  # "/login" — tela de login (mock, sem auth real ainda)
```

## Contrato de API

O cliente em `src/api/client.ts`/`src/api/types.ts` modela os endpoints REST do backend
(`GET /api/empresas`, `.../competencias`, `.../gates`, `/api/pendencias`, `/api/portfolio`, etc.).
Consulte o plano do portal para o contrato completo. Ações de escrita (`PUT status`,
`PATCH gates/{gate}`, `POST/PATCH/DELETE pendencias`) já estão tipadas e implementadas no cliente,
mas os botões de ação nas telas ainda estão desabilitados (placeholder) — serão ligados na fase de
implementação operacional.
