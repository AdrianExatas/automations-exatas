# Portal de Apuração de ICMS

Interface web para o setor fiscal: portfólio de empresas/competências, KPIs, Gates 1/2/3, status do workflow (19 etapas), módulos/achados/cruzamentos, pendências e download dos Excel da pasta `09`.

Substitui o painel Streamlit (`python -m motor_fiscal painel`) como entrega operacional. A entrega **arquivo** continua sendo o Excel em `_local/dossies/<cnpj>/<AAAA-MM>/09 - Relatorio de conferencia/`.

## Arquitetura

| Camada | Stack | Porta |
| --- | --- | --- |
| Backend | FastAPI + SQLite operacional | `http://127.0.0.1:8001` |
| Frontend | React 19 + Vite + TS + Tailwind | `http://localhost:5173` |

O frontend faz proxy de `/api` → `http://127.0.0.1:8001` em desenvolvimento. A porta **8001** evita conflito com apps que já usam `8000` (Docker/WSL/outras APIs).

## Como subir

### Backend

```powershell
cd portal\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e ..\..\..\motor-fiscal   # necessario para Processar competencia
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Docs interativas: `http://127.0.0.1:8001/docs`

### Upload e processamento (Etapa 1 do wizard)

Na tela da competência → etapa **Documentos e Integridade**:

1. Envie XML (`.xml`/`.zip`), EFD ICMS/IPI (`.txt`), opcionalmente EFD-Contribuições e `guias.json`.
2. Os arquivos vão para `empresas/<slug>/<MM-AAAA>/{XML,SPED,GUIAS}/`.
3. Clique em **Processar competência** — o backend roda `importar` + `auditar` do `motor-fiscal` em background e grava o pacote na pasta `09` do dossiê.
4. Acompanhe o progresso no painel do job; ao concluir, os achados da etapa são atualizados.

Endpoints: `GET/POST/DELETE .../inputs`, `POST .../processar`, `GET .../jobs/{id}`.

### Frontend

```powershell
cd portal\frontend
npm install
npm run dev
```

Abrir: `http://localhost:5173`

### Build de produção (frontend)

```powershell
cd portal\frontend
npm run build
```

## Login (v1 — auth só no frontend)

Lista fixa em `frontend/src/constants/users.ts`:

| Usuário | Senha | Nome |
| --- | --- | --- |
| `ana.fiscal` | `fiscal123` | Ana Fiscal |
| `bruno.revisor` | `fiscal123` | Bruno Revisor |
| `carla.coord` | `fiscal123` | Carla Coordenadora |

Persistência: `localStorage` (`portal-fiscal-user`). O backend **não** exige token nesta versão.

## Páginas

- `/login` — autenticação
- `/` — dashboard/portfólio
- `/empresas/:cnpj/:competencia` — detalhe (visão geral, gates, módulos, pendências, documentos)
- `/pendencias` — visão global filtrável (tabela/kanban) + CRUD

## Dados

- Empresas: `apuracao-ICMS/config/empresas.json` (precisa de `slug` para upload)
- Inputs enviados pela UI: `empresas/<slug>/<MM-AAAA>/`
- Relatórios: dossiê `09/tecnico/*.json` + XLSX na pasta `09`
- Estado operacional (status, gates, pendências, jobs): `portal/backend/_local/operacional.db`
- Bancos do motor após processar: `motor-fiscal/_local/db/<cnpj>/<AAAA-MM>.db`
