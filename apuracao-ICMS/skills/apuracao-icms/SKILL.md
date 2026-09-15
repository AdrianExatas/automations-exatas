---
name: apuracao-icms
description: >-
  Conduz o fechamento mensal da apuração de ICMS com humano no loop: identifica
  status, aplica Gates 1/2/3, checklist de conciliação, matriz tributária e
  scaffold do dossiê mensal.   Usa o motor-fiscal (Python/SQLite) como ferramenta
  dos Gates para importar XML/EFD, auditar e gerar a entrega fiscal em Excel
  na pasta 09 do dossiê. Use quando o usuário pedir apoio à apuração de ICMS,
  EFD ICMS/IPI, conciliação fiscal, guias, CIAP, ST, DIFAL/FCP, FECOEP (AL) ou
  fechamento de competência. Não transmite obrigações nem substitui Domínio/PVA/SEFAZ.
---

# Apuração de ICMS — Fechamento Mensal

## Escopo e limites

Esta skill **orienta o processo e dispara o motor fiscal** nos Gates. Ela:

- identifica o status atual da competência (19 status);
- indica a próxima macroetapa e o documento aplicável (PR/IN/FORM/MP);
- aplica os Gates 1/2/3 e o checklist de conciliação **com apoio do `motor-fiscal/`**;
- cria a estrutura do dossiê mensal (15 pastas) e aponta a entrega ao fiscal (Excel na pasta `09`);
- aponta o **portal web** (`apuracao-ICMS/portal/`) como interface oficial do setor fiscal (portfólio, Gates, status, pendências, download dos Excel).

Esta skill **não**:

- transmite obrigações ou gera guias nos portais;
- inventa caminhos de sistema, códigos oficiais ou regras de UF não confirmadas;
- trata o ControlDocs como ferramenta operacional (é **legado/contraprova** até aposentar).

O humano decide e executa nos sistemas (Domínio/PVA/SEFAZ etc.). A skill guia, bloqueia avanços indevidos, organiza evidências e **invoca o motor** para ler XML/SPED e produzir auditorias/relatórios.

## Layout de inputs de cliente

Dados reais ficam em `empresas/<slug>/MM-AAAA/` (**não versionar** — `empresas/` no `.gitignore`):

```
empresas/<slug>/MM-AAAA/
├── SPED/          # EFD ICMS/IPI, Contribuições, ControlDocs .xlsb, recibos
├── XML/           # ENTRADAS, SAIDAS, CTE (e zips)
├── GUIAS/         # DAR*.pdf, DARF*.pdf, APURAÇÃO *.xlsx, guias.json
├── DIFAL/         # opcional
├── GIA_ST/        # opcional
├── MIT/           # opcional
├── ICMS_ANTECIPADO/  # se houver
└── RELATORIOS/    # quebra de sequência, entradas/saídas
```

Competência CLI = `AAAA-MM`; pasta local = `MM-AAAA`.

## Ferramenta dos Gates: `motor-fiscal/`

Projeto irmão na raiz do monorepo: `../motor-fiscal/`.

```powershell
cd ..\motor-fiscal
pip install -e ".[dev]"

python -m motor_fiscal importar `
  --empresa "<CNPJ>" --competencia "AAAA-MM" `
  --xml-dir "..\apuracao-ICMS\empresas\<slug>\MM-AAAA\XML" `
  --efd "..\apuracao-ICMS\empresas\<slug>\MM-AAAA\SPED\<remessa>.txt" `
  --efd-contrib "..\apuracao-ICMS\empresas\<slug>\MM-AAAA\SPED\<contrib>.txt"

python -m motor_fiscal auditar `
  --empresa "<CNPJ>" --competencia "AAAA-MM" `
  --modulos completo `
  --guias "..\apuracao-ICMS\empresas\<slug>\MM-AAAA\GUIAS\guias.json" `
  --dossie "..\apuracao-ICMS\_local\dossies\<CNPJ>\AAAA-MM"

python -m motor_fiscal paridade `
  --motor "_local\auditorias\<CNPJ>\AAAA-MM.json" `
  --controldocs "<export-controldocs-ou-contraprova.json>" `
  --saida "_local\paridade\<CNPJ>\AAAA-MM"
```

Fluxo Bonsono (homologação): **importar → auditar completo + guias → paridade**.

- EFD canônico = remessa transmitida (`SpedEFD-...`); em retificação preferir **substituto**.
- EFD-Contribuições = PVA quando existir; senão o `.txt` principal.
- **Gate 1**: `documental`. **Gate 2**: `completo`. **Gate 3**: `--guias guias.json` — em AL fecha os **quatro DARs** (ICMS, FECOEP, DIFAL, FECOEP DIFAL).
- **Entrega ao fiscal (arquivo)** → Excel na pasta `09` do dossiê (`Resumo_Conferencia.xlsx` + módulos). Abrir primeiro o resumo.
- **Interface oficial** → portal web em `apuracao-ICMS/portal/` (dashboard, Gates/status operacionais, pendências, download dos XLSX). Subir com backend FastAPI (`portal/backend`) + frontend Vite (`portal/frontend`); ver `portal/README.md`.
- JSON completo → só em `09/tecnico/` (uso do motor/técnicos; não entregar ao analista como produto).
- Com `--dossie`, o XLSX fiscal é sempre gerado.
- Painel Streamlit (`python -m motor_fiscal painel`) é **legado/técnico** — não é a entrega ao fiscal; preferir o portal.
- Config UF: `motor-fiscal/config/icms_<uf>.json` (ex.: `icms_al.json` com bloco `fecoep`).
- FECOEP AL ≠ FCP E310: motor expõe `vl_fecoep_recolher` / `vl_fecoep_difal_recolher` (E116 `50059`/`50075`).

Regenerar só o pacote 09 a partir de auditoria já existente:

```powershell
python -m motor_fiscal relatorio `
  --empresa "<CNPJ>" --competencia "AAAA-MM" `
  --auditoria-json "_local\auditorias\<CNPJ>\AAAA-MM.json" `
  --dossie "..\apuracao-ICMS\_local\dossies\<CNPJ>\AAAA-MM"
```


### Status da paridade (Bonsono)

| Competência | ICMS × DAR/E116 | FECOEP × DAR | Export ControlDocs `.xlsb` | Observação |
| --- | --- | --- | --- | --- |
| 2026-05 | `80353,14` (`13170`) | Normal `34918,38` (`50059`); DIFAL `432,19` (`50075`) | Ainda sem export automatizado (COM rejeitou) | Remessa EFD (não Domínio) |
| 2026-06 | `85993,21` (`13170`) | Normal `25270,95` (`50059`); DIFAL `320,36` (`50075`) | Idem | Contraprova parcial em `motor-fiscal/_local/paridade/` |
| 2026-07 | Pendente (pacote incompleto) | — | — | Depois de remessa + Contribuições |

**Não desligar ControlDocs** até paridade com export real do `.xlsb` em ≥2 competências.

Detalhes: `../motor-fiscal/README.md`.

## Fontes obrigatórias

Leia **antes** de conduzir a competência:

1. `references/mapa-macro-processo.md`
2. `references/gates-de-controle.md`
3. `references/checklist-conciliacao.md`
4. `references/matriz-tributaria.md`
5. `references/dossie-mensal-estrutura.md`

Documentação oficial do pacote (quando existir):

- `../../content/apuracao-icms-fechamento-mensal/content-v2.json`
- `../../documentos/apuracao-icms-fechamento-mensal/documentos/` (`PR.FIS.001`, `IN.FIS.001`, `FORM.FIS.001`, `MP.FIS.001`)

Fonte do mapeamento original: `../../chat.md`.

## Fluxo de trabalho da skill

1. **Coletar contexto mínimo** (uma rodada):
   - empresa (CNPJ ou código interno);
   - competência `AAAA-MM`;
   - UF;
   - status atual (se conhecido) entre os 19 do mapa;
   - se já existe dossiê local;
   - caminhos de XML / EFD ICMS-IPI / EFD-Contribuições (quando for auditar no motor).

2. **Posicionar a competência**
   - Se o status não for informado, pergunte qual das 19 etapas melhor descreve o momento.
   - Informe a macroetapa correspondente do PR (`E01`–`E16`) e o que o FORM exige nela.

3. **Scaffold do dossiê** (se ainda não existir):

   ```powershell
   python "skills/apuracao-icms/scripts/scaffold_dossie_mensal.py" `
     --empresa "<CNPJ_ou_codigo>" `
     --competencia "AAAA-MM"
   ```

   Saída padrão: `apuracao-ICMS/_local/dossies/<empresa>/<AAAA-MM>/`.

4. **Conduzir etapa a etapa**
   - Use a IT (`IN.FIS.001`) como roteiro operacional.
   - Em cada Gate, rode o motor (quando houver inputs) **e** faça as perguntas objetivas do FORM; **não avance** se houver bloqueio.
   - Na conciliação, percorra os 13 cruzamentos (módulo ICMS); diferença não justificada = pendência fiscal.
   - Aponte a matriz tributária quando a dúvida for CFOP/CST/crédito/débito/ST/DIFAL/FCP/benefício.
   - Grave a entrega fiscal (Excel) na pasta `09` do dossiê (`--dossie`); oriente o analista a abrir `Resumo_Conferencia.xlsx`.

5. **Registrar pendências**
   - Sempre com: etapa, fato observado, impacto, responsável sugerido, próximo passo.
   - Não invente fundamento legal; valores vêm do motor ou dos sistemas oficiais.

6. **Fechamento**
   - Só oriente marcar `FECHADA` quando EFD + recibo + obrigações (se aplicáveis) + guias + pagamento + dossiê estiverem completos.
   - Pós-fechamento: retificação exige reabertura controlada documentada.

## Gates (resumo operacional)

| Gate | Pergunta bloqueante | Ferramenta | Ação se SIM bloqueante |
| --- | --- | --- | --- |
| 1 Integridade | Existem documentos faltantes? | `motor_fiscal auditar --modulos documental` | Abrir pendência documental e bloquear |
| 2 Revisão | Existe divergência na cadeia? | `motor_fiscal auditar --modulos completo` | Devolver à etapa responsável |
| 3 Guias | Alguma receita (ICMS/FECOEP/DIFAL) ≠ obrigação? | `auditar --modulos icms --guias ...` (cruzamento 13 / `itens_gate3`) | Não enviar; corrigir e regenerar |

Detalhes em `references/gates-de-controle.md`.

## Mapa rápido status → etapa PR

| Status | Etapa PR típica |
| --- | --- |
| 01–02 Documentação | E02 |
| 03–04 Conferência/pendência documental | E03 (Gate 1) |
| 05 Escrituração | E04–E05 |
| 06 Conferência de entradas | E06 |
| 07 Conferência de saídas | E07 |
| 08–09 Análise / apurações especiais | E08 |
| 10–11 Apuração preliminar / pendência fiscal | E09–E10 |
| 12–13 Revisão / aprovada | E11 (Gate 2) |
| 14–15 Validação / EFD transmitida | E12–E13 |
| 16–17 Guias / aguardando pagamento | E14–E15 (Gate 3) |
| 18–19 Pagamento / fechamento | E15–E16 |

## Regras de honestidade

- Lacunas de caminho de sistema, código oficial, prazo por UF ou responsável ficam explícitas como pendência — nunca inventadas.
- Riscos do MP com P/G vazios permanecem sugeridos até revisão humana.
- Não execute ações em portais fiscais por esta skill; no máximo oriente o operador.
- ControlDocs (`.xlsb` neste projeto) é **legado/contraprova** — use só para paridade (`motor_fiscal paridade`), não como motor do fechamento.

## Entregáveis esperados da conversa

Ao apoiar uma competência, deixe claro:

1. status atual e próximo passo;
2. resultado de cada Gate tocado (caminho do Excel na pasta `09`, em especial `Resumo_Conferencia.xlsx`);
3. pendências abertas;
4. caminho do dossiê (se criado);
5. lista do que ainda falta para FECHADA.
