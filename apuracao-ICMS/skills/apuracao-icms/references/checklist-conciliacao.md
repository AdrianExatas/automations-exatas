# Checklist de conciliação — Apuração de ICMS

Folha de conferência obrigatória antes do Gate 2 (revisão). Todos os cruzamentos devem fechar **100%** ou ter justificativa documentada e aprovada.

| # | Cruzamento | Deve fechar |
| --- | --- | --- |
| 1 | XML × escrituração | 100% |
| 2 | Total entradas × livro fiscal | 100% |
| 3 | Total saídas × livro fiscal | 100% |
| 4 | Débitos ICMS notas × apuração | 100% |
| 5 | Créditos ICMS notas × apuração | 100% |
| 6 | Ajustes × documentos comprobatórios | 100% |
| 7 | CIAP × crédito lançado | 100% |
| 8 | ST × apuração ST | 100% |
| 9 | DIFAL × apuração DIFAL | 100% |
| 10 | FCP × apuração FCP (E310) | 100% (N/A se UF sem E300/E310) |
| 11 | Saldo anterior × mês anterior | 100% |
| 12 | Apuração × EFD | 100% |
| 13 | EFD × guia (todas as receitas) | 100% |

### Gate 3 / cruzamento 13 — receitas AL (Bonsono)

Conferir **por `COD_REC`**, não só a soma:

| Tributo | E116 / DAR | Critério |
| --- | --- | --- |
| ICMS Normal | `13170` | = `VL_ICMS_RECOLHER` |
| FECOEP Normal | `50059` | = `vl_fecoep_recolher` (E111 FECOEP / `AL050001`) |
| ICMS DIFAL | `15610` | = guia DAR DIFAL |
| FECOEP DIFAL | `50075` | = `vl_fecoep_difal_recolher` |

`recomputar_e116` valida ICMS próprio (`COD_OR=000`) × E110 — **não** exige `soma(E116) == VL_ICMS_RECOLHER` (evita falso negativo multi-tributo).

## Como usar

1. Preencha a folha por competência/empresa.
2. Para cada linha com diferença: registrar valor, causa, responsável e ação.
3. Diferença não justificada = **bloqueio** no Gate 2.
4. Evidências vão para `09 – Relatório de conferência` do dossiê mensal.

## Conferência do Bloco E (antes da transmissão)

| Registro | Conferência |
| --- | --- |
| E100 | Período da apuração |
| E110 | ICMS próprio |
| E111 | Ajustes |
| E112/E113 | Detalhes dos ajustes quando aplicável |
| E115 | Informações adicionais da apuração |
| E116 | Obrigações a recolher (por `COD_REC`; AL: 13170/50059/15610/50075) |
| E200/E210 | ICMS-ST |
| E300/E310 | DIFAL/FCP genérico (se existir) |
| E111 FECOEP (AL) | `AL009999`/`AL029999` (desc. FECOEP), `AL040001`/`AL050001`, `AL050020` |
