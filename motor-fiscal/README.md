# motor-fiscal

Motor fiscal em Python para substituir integralmente o ControlDocs (planilha Excel/VBA usada no fechamento mensal de `apuracao-ICMS/`, que trava com grandes volumes). Todo o processamento acontece em SQLite em disco — Excel entra apenas como formato de saída de relatório (XLSX sem macros).

Estado atual: **M0–M9** (ingestão → auditorias/apurações → relatórios/painel/lote → paridade e integração com a skill).

## ControlDocs (legado / contraprova)

O arquivo `apuracao-ICMS/ControlDocs v2.2026.06.xlsb` permanece no monorepo só como **legado e contraprova**. O fluxo operacional dos Gates passa pelo `motor-fiscal`. Use o comando `paridade` para comparar indicadores módulo a módulo antes de aposentar a planilha.

## O que faz

Importa para um banco SQLite por empresa/competência:

- **XMLs**: NF-e (mod 55), NFC-e (mod 65), CT-e (mod 57), CF-e SAT (mod 59) e eventos;
- **EFD ICMS/IPI** e **EFD-Contribuições**.

Apura/audita: documental, ICMS, IPI, PIS/COFINS (+ exclusão ICMS da base), estoque/inventário, LMC, margens/oportunidades.

Gera relatórios JSON + XLSX por módulo e consolidado; painel Streamlit; lote multi-empresa; harness de paridade com ControlDocs.

## Setup

Requer Python 3.12+ (desenvolvido em 3.14).

```powershell
cd motor-fiscal
pip install -e .[dev]
# painel (também incluso em [dev]):
pip install -e .[painel]
```

Sem instalar: `$env:PYTHONPATH = "src"`.

## Uso

### Importar

```powershell
python -m motor_fiscal importar `
    --empresa 12.345.678/0001-99 `
    --competencia 2026-06 `
    --xml-dir C:\caminho\para\xmls `
    --efd C:\caminho\para\efd_icms_ipi.txt `
    --efd-contrib C:\caminho\para\efd_contribuicoes.txt
```

Banco: `_local/db/<cnpj>/<AAAA-MM>.db` (`--db-dir` ou `MOTOR_FISCAL_DB_DIR`).

### Auditar (uma empresa)

```powershell
python -m motor_fiscal auditar `
    --empresa 12.345.678/0001-99 `
    --competencia 2026-06 `
    --modulos completo `
    --guias C:\caminho\guias.json `
    --dossie C:\...\dossies\12345678000199\2026-06
```

- JSON consolidado (auditoria): `_local/auditorias/<cnpj>/<AAAA-MM>.json`
- **Entrega fiscal (Excel):** pasta `09` do dossiê — `Resumo_Conferencia.xlsx` + módulos; JSON técnico em `09/tecnico/`
- Com `--dossie` o XLSX é sempre gerado (`--no-xlsx` é ignorado); `--modulos todos` = documental/estoque/lmc/margens; `completo` = todos

### Lote multi-empresa

```powershell
python -m motor_fiscal auditar --todas-empresas --competencia 2026-06 --modulos completo
```

Varre `_local/db/*/2026-06.db`, fila sequencial, resumo em `_local/auditorias/lote-2026-06.json` (inclui falhas).

### Relatório (regenerar)

```powershell
python -m motor_fiscal relatorio `
    --empresa 12345678000199 --competencia 2026-06 `
    --modulos completo --dossie C:\...\2026-06
```

### Painel Streamlit (legado/técnico)

```powershell
python -m motor_fiscal painel
# ou: streamlit run app/painel.py -- --relatorios-dir _local/relatorios
```

A interface oficial ao setor fiscal é o **portal web** em `apuracao-ICMS/portal/` (FastAPI + React). O painel Streamlit permanece apenas como ferramenta técnica de drill-down.

### Paridade ControlDocs

Com fixtures sintéticas (CI / smoke):

```powershell
python -m motor_fiscal paridade `
    --motor tests/fixtures/paridade/motor_sintetico.json `
    --controldocs tests/fixtures/paridade/controldocs_sintetico.json `
    --saida _local/paridade/exemplo
```

Com dados reais: exporte do ControlDocs um JSON no formato de `tests/fixtures/paridade/controldocs_sintetico.json` (indicadores por módulo: `ok`, `erros`, `avisos`, `vl_icms_recolher`, `cruzamentos_ok`, …), rode o motor na mesma competência e compare. Saída em `_local/paridade/<cnpj>/<AAAA-MM>/`.

## Estrutura

```
motor-fiscal/
├── app/painel.py              # Streamlit
├── config/                    # icms_<uf>.json (AL: bloco fecoep), ipi_default.json
├── pyproject.toml
├── src/motor_fiscal/
│   ├── __main__.py            # CLI: importar | auditar | apurar | relatorio | paridade | painel
│   ├── orquestracao.py        # fila de modulos + lote
│   ├── relatorios/            # JSON/XLSX + destino dossie 09
│   ├── paridade/              # harness ControlDocs
│   ├── auditoria/ icms/ ipi/ pis_cofins/ estoque/ lmc/ margens/
│   ├── icms/fecoep_al.py      # FECOEP AL (Lei 6.558) — Normal/DIFAL ≠ FCP E310
│   ├── db/ ingestao/ util/
└── tests/
```

### FECOEP (Alagoas)

Em `auditar --modulos icms` com UF AL: `fecoep.vl_fecoep_recolher` (E116 `50059`) e
`vl_fecoep_difal_recolher` (`50075`). Cruzamento 13 expõe `itens_gate3` com as quatro
receitas. `recomputar_e116` confere só ICMS próprio (`COD_OR=000`) — sem falso negativo
multi-tributo. Cálculo analítico (C191/XML × 1%/2%): `fecoep_analitico`.

## Testes

```powershell
cd motor-fiscal
python -m pytest
python -m pytest tests/test_fecoep_al.py tests/test_icms.py -q
```

Fixtures em `tests/fixtures` (empresa `12345678000199`, competência `2026-06`; FECOEP AL em `efd_fecoep_al_2026-05.txt`).
