# Contrato de fidelidade MP (MP.FIS.001)

Documento normativo para geração e regressão do Mapeamento de Processo. Sempre que `mp` estiver em `documentos_solicitados`, o agente e o build devem cumprir este contrato.

Âncora visual: `referencias/01.3 MP.FIS.001 - Recálculo Guia Dpt. Fiscal.xlsx`.  
Template sanitizado: `assets/templates/MP-template.xlsx`.  
Regressão: `scripts/compare_mp_fidelity.py`.

## Motor obrigatório

- Gerar FORM/MP **somente** via `scripts/build_excel_openpyxl.py` (orquestrado por `build_documents.ps1`).
- **Não** usar `-UseExcelCom` em geração normal nem em lote: Excel sem ativação descarta merges e formas ao salvar.
- Regenerar o template só com `scripts/sanitize_mp_template.py` a partir da referência (corrige `E70` para `MUITO GRAVE`).

## BARREIRA e RESULTADO

- BARREIRA (`E`): merge `E{first_risk}:E{last_risk}`.
- Texto **uma vez** no topo do merge: linhas do pacote **FORM + IN + PR** (títulos via `documento.codigo_*` + `saida.arquivo_*`).
- **Nunca** gravar `FORM.… - Bloco B0x` na coluna BARREIRA (blocos ficam no FORM).
- RESULTADO (`J`): merge `J{first_risk}:J65`; consolidar `resultado_indicador` sem repetir por linha.
- Mitigação (`I`): **por linha**, sem merge forçado; `wrap_text` em E/I/J.

## Dropdowns (Plan1)

| Lista | Faixa | Aplicação |
|-------|--------|-----------|
| Departamentos | `Plan1!$D$1:$D$13` | `C3` (DEPART.), SIPOC `A10:A14` e `E10:E14` |
| QUEM FAZ | `Plan1!$B$1:$B$18` | `B40:B65` |
| Classificação | `Plan1!$C$1:$C$3` | `D40:D65` |

Departamentos (ordem fixa):

1. `01 - Atendimento`
2. `02 - Departamento Pessoal`
3. `03 - Fiscal`
4. `04 - Contábil`
5. `05 - Paralegal`
6. `06 - Financeiro`
7. `07 - Comercial`
8. `08 - Tecnologia da Informação`
9. `09 - Processos e Qualidade`
10. `10 - Sucesso do Cliente`
11. `11 - Recursos Humanos`
12. `12 - Marketing`
13. `13 - Auditoria`

Quando o setor for conhecido, `documento.setor` deve preferir um valor dessa lista.

## Layout e legenda

- Aba `MP`, zoom 85%, grade oculta, freeze `A7`, 86 linhas, formas DrawingML (elipse/retângulo + setas), logo do template.
- `ETAPAS` (coluna A) vazia no mapa — rótulo na forma.
- BARREIRA sem hiperlink azul / underline.
- Legenda de gravidade: célula **`E70` = `MUITO GRAVE`** (sem espaço em `GRAV E`).
- P/G padrão pela normalização quando ausentes; `P×G` e classificação colorida via CF.
- Slots de risco: linhas **40–65**. Com `N` riscos preenchidos, ficam **visíveis** `40…39+N` e **ocultos** os ociosos `40+N…65`. Também ocultas: linha `6` (resultado) e reserva SIPOC `16–37`. A referência FIS.001 usa `N=4` (≈45 ocultas); `N>4` reduz o total e **não** é falha — o gate valida a estrutura, não um limiar fixo ≥45.

## Conteúdo JSON (quando MP está na seleção)

Obrigatório para a BARREIRA sair completa:

- `documento.codigo_form`, `codigo_it`, `codigo_pop` (e `codigo_mp`)
- `saida.arquivo_form`, `arquivo_it`, `arquivo_pop` (e `arquivo_mp`)

Recomendado:

- `mp.riscos[].mitigacao` e `resultado_indicador` quando a fonte sustentar
- `documento.setor` alinhado à lista 01–13

## Gate de entrega

Após gerar o MP, o build chama:

```powershell
python scripts/compare_mp_fidelity.py `
  --generated "<pasta>/documentos/<arquivo_mp>" `
  --reference "../../referencias/01.3 MP.FIS.001*.xlsx"
```

Falha do comparador = falha do build. Use `-SkipMpFidelity` **somente** para debug local.

## Lote

Use `scripts/build_lote.ps1` para vários processos; ele chama `build_documents.ps1` (com gate de fidelidade) e agrega `lote-relatorio.md`. Não passa `-UseExcelCom`.
