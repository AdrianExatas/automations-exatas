# Dossiê mensal de ICMS — estrutura

Criar automaticamente uma pasta por competência contendo as 15 subpastas abaixo.

## Nomenclatura recomendada

```
_local/dossies/<CNPJ_ou_codigo_empresa>/<AAAA-MM>/
```

Exemplo: `_local/dossies/12345678000199/2026-07/`

## Subpastas (15)

| Pasta | Conteúdo esperado |
| --- | --- |
| `01 – Documentos fiscais` | XMLs, eventos, documentos complementares da competência |
| `02 – Relatórios de entradas` | Relatórios/livros de entradas |
| `03 – Relatórios de saídas` | Relatórios/livros de saídas |
| `04 – Apuração ICMS próprio` | Demonstrativo da conta gráfica / E110 |
| `05 – ICMS-ST` | Apuração ST por UF |
| `06 – DIFAL/FCP` | Apuração DIFAL/FCP por UF |
| `07 – CIAP` | Controles e lançamentos do Bloco G |
| `08 – Ajustes e benefícios` | Documentos comprobatórios dos ajustes |
| `09 – Relatório de conferência` | **Entrega ao fiscal:** `Resumo_Conferencia.xlsx` + XLSX por módulo; JSON técnico em `tecnico/` |
| `10 – EFD transmitida` | Arquivo EFD enviado |
| `11 – Recibo` | Recibo de transmissão |
| `12 – Obrigações estaduais` | Declarações/demonstrativos adicionais da UF |
| `13 – Guias` | DAE/DAR/GNRE e demais guias |
| `14 – Comprovantes` | Comprovantes de pagamento |
| `15 – Evidências de revisão` | FORM preenchido, parecer do revisor, prints |

## Critério de fechamento

A competência só fica **FECHADA** quando houver:

- EFD transmitida
- Protocolo/recibo
- Obrigações estaduais transmitidas (quando aplicável)
- Guias geradas
- Pagamento acompanhado/confirmado
- Documentação arquivada neste dossiê

Alterações posteriores exigem **reabertura controlada** (fluxo de retificação).

## Script

Use `skills/apuracao-icms/scripts/scaffold_dossie_mensal.py` para criar a estrutura.
