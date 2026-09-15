# Contrato de fidelidade FORM (FORM.QUA.002)

Documento normativo para geração e regressão do checklist/formulário de verificação. Sempre que `form` estiver em `documentos_solicitados`, o agente e o build devem cumprir este contrato.

Âncora visual: `referencias/FORM.QUA.002 - Modelo Check List Tarefa.xlsx`.  
Referência de processo (mesma família): `referencias/01.2 FORM.FIS.001 - Recálculo Guia Departamento Fiscal.xlsx`.  
Template sanitizado: `assets/templates/FORM-template.xlsx`.  
Regressão: `scripts/compare_form_fidelity.py`.

## Motor obrigatório

- Gerar FORM/MP **somente** via `scripts/build_excel_openpyxl.py` (orquestrado por `build_documents.ps1`).
- **Não** usar `-UseExcelCom` em geração normal nem em lote: Excel sem ativação descarta merges e imagens ao salvar.
- Regenerar o template só com `scripts/sanitize_form_template.py` a partir da referência FORM.QUA.002.

## Layout institucional

- Aba `FORM`, zoom 85%, grade oculta, **sem** freeze de painéis, área de impressão `B2:K85`.
- Cabeçalho com logo, Setor (`C3`), Código (`D3`), título (`F2`), Data Emissão (`F4`), Data Revisão (`I4`), Versão (`J4`).
- Painel `1 - Coeficiente de Conformidade` (`B7`/`F7`) e `Resumo de Inspeção` lateral (`G7:K12`).
- Até **7 blocos** com capacidade fixa de itens:

| Bloco | Header | Coef. | Itens | Parecer | Capacidade |
|------:|-------:|------:|-------|-----------:|-----------:|
| 1 | 14 | 15 | 16–17 | 18 | 2 |
| 2 | 19 | 20 | 21–22 | 23 | 2 |
| 3 | 24 | 25 | 26–27 | 28 | 2 |
| 4 | 29 | 30 | 31–32 | 33 | 2 |
| 5 | 34 | 35 | 36–45 | 46 | 10 |
| 6 | 47 | 48 | 49–63 | 64 | 15 |
| 7 | 65 | 66 | 67–78 | 79 | 12 |

- **Cota de slots grandes:** no máximo **3 blocos com >2 itens** (cabem só em 5/6/7). Blocos com ≤2 itens usam preferencialmente os slots 1–4. O packing do builder reserva 5–7 para blocos grandes; conteúdo com >3 blocos grandes falha no gate de qualidade.
- Cada bloco usado traz título `N | TITULO`, `Coeficiente Parcial`, perguntas em `B`, respostas `SIM/NÃO` em `G` e `Parecer Inspeção`.
- Blocos/itens não usados ficam ocultos; `F7` e `K12` usam somente os coeficientes dos blocos preenchidos.
- Resumo lateral fixo por slot (`G9`/`I9` … `K11`/`J11`); não remapear 1..N limpando `J9:J11`.
- Coeficiente parcial (`F15`, `F20`, …) mantém a **faixa institucional** do template (`M16:M17`, `M36:M45`, …), sem estreitar aos itens usados.
- Prazo: `C9` recebe data de início (contexto/`emissao`/`=C8`); `C10`/`C11` seguem `prazo_dias` ou o padrão do template com `C11=C10`.
- Rodapé: `OBSERVAÇÃO`, frequência, Obs1/Obs2 e assinaturas (`B85`/`F85`/`I85`).

## Preenchimento (somente valores)

- Estilos, merges, CF (17 regras), validações e logo vêm do template — **não** reconstruir layout com `Workbook()`.
- Após o `save` do openpyxl, `restore_form_drawing()` restaura o DrawingML (`xdr:wsDr`), os 11 comentários institucionais (`comments1.xml` + `vmlDrawing1.vml` + `legacyDrawing`), remove hiperlink legado SEMED, corrige targets absolutos e limpa o freeze via `sheetViews` (não usar `freeze_panes=None` no openpyxl).
- Respostas iniciam vazias; parecer do bloco inicia em `NÃO CONFORME` (dropdown institucional `CONFORME` / `NÃO CONFORME`).
- Cliente: `C12`/`E12` a partir de `form.campos_contexto` (CNPJ / nome), com placeholders quando vazios.
- Ranges nomeados operacionais: `FORM_RESPOSTAS`, `FORM_PARECERES`, `FORM_COEFICIENTES`.

## Anti-padrões (proibidos)

Regressões já vistas nesta família de arquivos — não reintroduzir:

- Usar `ws.freeze_panes = None` (ou equivalente) via openpyxl — **corrompe** o pacote e o Excel pede reparo. Remover freeze só substituindo `<sheetViews>` em `restore_form_drawing()`.
- Apagar `xl/comments1.xml`, `xl/drawings/vmlDrawing1.vml` ou a tag `<legacyDrawing>` — somem os 11 balões institucionais; o Excel pode reparar o drawing.
- Deixar targets absolutos (`Target="/xl/..."`), hiperlink legado SEMED/`anysvml`, ou DrawingML sem prefixo `xdr:` após o save do openpyxl.
- Remapear o resumo lateral 1..N limpando `J9:J11` (o layout institucional é fixo por slot: `I9`↔bloco1 … `J11`↔bloco7).
- Estreitar `F{coef}` só aos itens preenchidos (ex.: `AVERAGE(M36,M37,M38,M39)` no lugar de `AVERAGE(M36:M45)`).
- Deixar `C9` vazio — `C10`/`C11` viram números e `F8`/`E8` (status de prazo) quebram.

## Gate de entrega

Após gerar o FORM, o build chama:

```powershell
python scripts/compare_form_fidelity.py `
  --generated "<pasta>/documentos/<arquivo_form>" `
  --reference "../../referencias/FORM.QUA.002*.xlsx"
```

Falha do comparador = falha do build. Use `-SkipFormFidelity` **somente** para debug local.

## Regeneração do template

```powershell
python skills/gerar-pop-it/scripts/sanitize_form_template.py
```
