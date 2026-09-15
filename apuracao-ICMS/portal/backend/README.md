# Portal de Apuração de ICMS — Backend

API em **FastAPI** que serve o portal web (frontend em `portal/frontend/`):

- **Leitura** dos relatórios já gerados pelo motor fiscal (`_local/dossies/.../09 - Relatorio de conferencia/tecnico/*.json`,
  com fallback em `motor-fiscal/_local/auditorias/<cnpj>/<AAAA-MM>.json`).
- **Camada operacional** própria (SQLite em `_local/operacional.db`): status do
  workflow (19 etapas), Gates (1/2/3), pendências e log de auditoria das ações.

Não depende do pacote `motor_fiscal` nem de SQLAlchemy — usa `sqlite3` da
stdlib no mesmo espírito de `motor_fiscal/db/schema.py`.

## Setup

```powershell
cd portal\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e ..\..\..\motor-fiscal
```

O `motor-fiscal` é obrigatório para o endpoint `POST .../processar` (importar + auditar).

## Rodar

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

A API sobe em `http://127.0.0.1:8001` (porta 8001 para não disputar a 8000).
CORS liberado para `http://localhost:5173` (frontend Vite) — configurável via env
`PORTAL_CORS_ORIGINS` (lista separada por vírgula).

Docs interativas: `http://127.0.0.1:8001/docs`.

## Estrutura

```
app/
├── main.py             # FastAPI app, CORS, inclui os routers
├── config.py           # caminhos (dossies, auditorias, empresas.json, db operacional)
├── util.py             # normalizacao de CNPJ/competencia, timestamps ISO
├── status.py           # descricoes fixas dos 19 status do workflow
├── models.py           # modelos Pydantic (request/response)
├── empresas.py         # leitura de config/empresas.json
├── relatorios.py        # localizacao/leitura dos JSON de relatorio (dossie/auditoria) + KPIs
├── operacional_db.py   # schema + CRUD do SQLite operacional (status/gates/pendencias/auditoria)
├── servicos.py         # composicao leitura (relatorios) + operacional (db) usada pelos routers
└── routers/
    ├── empresas.py      # GET /api/empresas
    ├── competencias.py  # /api/empresas/{cnpj}/competencias/...
    ├── pendencias.py    # /api/pendencias...
    └── portfolio.py      # GET /api/portfolio
```

## Variáveis de ambiente (opcionais)

| Variável | Uso | Padrão |
| --- | --- | --- |
| `APURACAO_ICMS_ROOT` | raiz de `apuracao-ICMS/` | pasta pai de `portal/backend` |
| `MOTOR_FISCAL_ROOT` | raiz de `motor-fiscal/` | `<pai de apuracao-ICMS>/motor-fiscal` |
| `OPERACIONAL_DB_PATH` | caminho do SQLite operacional | `portal/backend/_local/operacional.db` |
| `PORTAL_CORS_ORIGINS` | origens CORS liberadas (lista separada por vírgula) | `http://localhost:5173` |

## Endpoints

Ver lista completa no `README.md` da raiz do `portal/` (ou na resposta da
sessão que implementou este backend). Resumo rápido:

- `GET /api/empresas`
- `GET /api/empresas/{cnpj}/competencias`
- `GET /api/empresas/{cnpj}/competencias/{competencia}`
- `GET /api/empresas/{cnpj}/competencias/{competencia}/modulos/{modulo}`
- `GET /api/empresas/{cnpj}/competencias/{competencia}/arquivos`
- `GET /api/empresas/{cnpj}/competencias/{competencia}/arquivos/{nome}`
- `GET|PUT /api/empresas/{cnpj}/competencias/{competencia}/status`
- `GET /api/empresas/{cnpj}/competencias/{competencia}/gates`
- `PATCH /api/empresas/{cnpj}/competencias/{competencia}/gates/{gate}`
- `GET|POST /api/pendencias`, `PATCH|DELETE /api/pendencias/{id}`
- `GET /api/portfolio`
- `GET|POST /api/empresas/{cnpj}/competencias/{comp}/inputs` (upload multipart)
- `DELETE /api/empresas/{cnpj}/competencias/{comp}/inputs/{tipo}/{nome}`
- `POST /api/empresas/{cnpj}/competencias/{comp}/processar`
- `GET /api/empresas/{cnpj}/competencias/{comp}/jobs/atual`
- `GET /api/empresas/{cnpj}/competencias/{comp}/jobs/{id}`

CNPJ pode ser informado com ou sem máscara — é normalizado (só dígitos) em
todas as rotas.
