# Apuração de ICMS — Automação fiscal

Fechamento mensal da apuração de ICMS com **humano no loop**, usando o motor Python em [`motor-fiscal/`](../motor-fiscal/).

O motor importa XML/EFD, audita (Gates), gera a **entrega fiscal em Excel** na pasta `09` do dossiê (JSON fica só em `09/tecnico/`). Não transmite obrigações nem substitui Domínio, PVA ou SEFAZ.

**ControlDocs** (`.xlsb`) é **legado/contraprova** — não é o motor operacional. Compare competências com `python -m motor_fiscal paridade` até o desligamento formal.

## Objetivo

1. Importar e auditar competências reais (XML + EFD ICMS/IPI + EFD-Contribuições + guias)
2. Aplicar Gates de controle e conciliação (incluindo EFD × guia)
3. Gerar a entrega ao fiscal (Excel) na pasta `09` do dossiê mensal
4. Homologar contra ControlDocs/DAR quando necessário (`paridade`)

## Entrada (por empresa/competência)

Layout padrão em `empresas/` (**não versionar**):

```
empresas/<slug>/MM-AAAA/
├── SPED/          # remessa EFD, Domínio/Cliente, Contribuições, ControlDocs .xlsb
├── XML/           # ENTRADAS, SAIDAS, CTE
├── GUIAS/         # DAR/DARF, APURAÇÃO, guias.json
├── DIFAL/
├── GIA_ST/
├── MIT/
└── RELATORIOS/
```

| Entrada | Uso |
| --- | --- |
| XML (NF-e, NFC-e, CT-e, CF-e) | Gate 1 e cruzamentos |
| EFD ICMS/IPI (remessa transmitida) | Livro, Bloco E, estoque, LMC |
| EFD-Contribuições | PIS/COFINS |
| `GUIAS/guias.json` | Cruzamento EFD × guia (Gate 3) |
| Empresa / `AAAA-MM` / UF | Contexto da competência |

## Saída

| Saída | Onde |
| --- | --- |
| Banco SQLite da competência | `motor-fiscal/_local/db/<cnpj>/<AAAA-MM>.db` |
| Auditoria consolidada | `motor-fiscal/_local/auditorias/<cnpj>/<AAAA-MM>.json` |
| **Entrega ao fiscal (Excel)** | pasta `09` do dossiê — abrir primeiro `Resumo_Conferencia.xlsx` |
| JSON técnico (motor/dev) | `09/tecnico/*.json` (não é a entrega do analista) |
| Paridade ControlDocs | `motor-fiscal/_local/paridade/<cnpj>/<AAAA-MM>/` |
| Dossiê mensal | `_local/dossies/<cnpj>/<AAAA-MM>/` (15 pastas, não versionado) |

## Portal web (interface oficial ao fiscal)

O portal em [`portal/`](portal/) é a **entrega operacional ao setor fiscal**: dashboard de portfólio, detalhe por empresa/competência (KPIs, Gates, status, módulos, documentos) e gestão de pendências. Substitui o painel Streamlit como interface do dia a dia.

```powershell
# Backend (API FastAPI — porta 8001; 8000 costuma estar ocupada)
cd portal\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# Frontend (Vite — http://localhost:5173, proxy /api → :8001)
cd ..\frontend
npm install
npm run dev
```

- Login demo: `ana.fiscal` / `fiscal123` (também `bruno.revisor` e `carla.coord`)
- Detalhes: [`portal/README.md`](portal/README.md)
- A entrega **arquivo** ao fiscal continua sendo o Excel na pasta `09` do dossiê (`Resumo_Conferencia.xlsx`)
- Painel Streamlit (`python -m motor_fiscal painel`) fica **legado/técnico** — uso opcional para drill-down de JSON

## Estrutura deste diretório

```
apuracao-ICMS/
├── README.md
├── .gitignore
├── config/empresas.json         # registro slug → CNPJ/UF
├── portal/                      # portal web (FastAPI + React)
│   ├── backend/
│   └── frontend/
├── empresas/<slug>/MM-AAAA/     # inputs de cliente (NÃO versionar)
├── skills/apuracao-icms/        # skill Cursor (Gates, fluxo, scaffold)
│   ├── SKILL.md
│   ├── references/
│   └── scripts/scaffold_dossie_mensal.py
└── tests/                       # validação fictícia + integração com o motor
```

O código do motor fica em [`../motor-fiscal/`](../motor-fiscal/).

## Setup

```powershell
cd ..\motor-fiscal
pip install -e ".[dev]"
```

Python 3.12+. Detalhes em [`motor-fiscal/README.md`](../motor-fiscal/README.md).

## Execução

### Fluxo operacional

```powershell
cd ..\motor-fiscal

python -m motor_fiscal importar --empresa <CNPJ> --competencia AAAA-MM `
  --xml-dir "..\apuracao-ICMS\empresas\<slug>\MM-AAAA\XML" `
  --efd "...\SPED\<remessa>.txt" `
  --efd-contrib "...\SPED\<contrib>.txt"

python -m motor_fiscal auditar --empresa <CNPJ> --competencia AAAA-MM --modulos completo `
  --guias "..\apuracao-ICMS\empresas\<slug>\MM-AAAA\GUIAS\guias.json" `
  --dossie "..\apuracao-ICMS\_local\dossies\<CNPJ>\AAAA-MM"

python -m motor_fiscal paridade `
  --motor "_local\auditorias\<CNPJ>\AAAA-MM.json" `
  --controldocs "<export-cd.json>" `
  --saida "_local\paridade\<CNPJ>\AAAA-MM"
```

Lote multi-empresa: `python -m motor_fiscal auditar --todas-empresas --competencia AAAA-MM --modulos completo`.

Interface ao fiscal: portal em [`portal/`](portal/) (ver seção acima). Painel Streamlit legado: `python -m motor_fiscal painel`.

### Skill Cursor

No Cursor, peça apoio à apuração (gates, EFD, guias, dossiê). A skill em [`skills/apuracao-icms/SKILL.md`](skills/apuracao-icms/SKILL.md) orienta o agente a disparar o motor e organizar evidências.

### Criar dossiê mensal

Na raiz de `apuracao-ICMS/`:

```powershell
python "skills/apuracao-icms/scripts/scaffold_dossie_mensal.py" `
  --empresa "11188276000161" `
  --competencia "2026-06"
```

### Validação fictícia

Smoke do fluxo (fixtures do motor + dossiê):

```powershell
python "apuracao-ICMS/tests/scripts/validate_fechamento_ficticio.py"
```

Detalhes em [tests/README.md](tests/README.md).

## Gates de controle

| Gate | Bloqueio |
| --- | --- |
| 1 Integridade | Documentos faltantes → pendência documental |
| 2 Revisão | Divergência na cadeia → não liberar EFD |
| 3 Guias | Alguma receita (ICMS / FECOEP / DIFAL / FECOEP DIFAL) ≠ obrigação → não enviar |

## Homologação Bonsono

Empresa `11188276000161` (UF AL), competências em `empresas/bonsono/{05,06,07}-2026/`.

- Importar + auditar 05/06 com `--guias` (remessa EFD, não Domínio): Gate 3 nas quatro receitas
  - ICMS `13170`, FECOEP Normal `50059`, ICMS DIFAL `15610`, FECOEP DIFAL `50075`
- Motor: `vl_fecoep_recolher` / `vl_fecoep_difal_recolher` (FECOEP AL ≠ FCP E310)
- Paridade motor × `.xlsb` ControlDocs: parcial (planilha salva pré-assistente); estoque/LMC ok
- Artefatos: `motor-fiscal/_local/paridade/11188276000161/`

ControlDocs só desliga após aceite formal (paridade completa ou motor×DAR como verdade operacional).

## Relação com outros projetos

| Projeto | Relação |
| --- | --- |
| `motor-fiscal/` | Motor Python/SQLite dos Gates |
| `Dominio/` | Automações adjacentes; não são a apuração |
| `baixar-e-solicitar-xml-sefaz/`, `Sieg/xml/`, `Fsist/` | Captura de XML — alimentam o recebimento |

## O que não versionar

- `empresas/` (SPED, XML, guias e demais dados de cliente)
- `_local/dossies/` e evidências de cliente
- `.env`, certificados, planilhas operacionais diárias
