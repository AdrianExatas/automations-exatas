# Mapa macro — Apuração de ICMS (fechamento mensal)

Fonte: mapeamento operacional exportado em `apuracao-ICMS/chat.md`.
Trate a apuração como **fluxo de fechamento mensal**, não apenas “importar notas → apurar → gerar guia”.

## Fluxo macro

```
PARAMETRIZAÇÃO TRIBUTÁRIA
→ RECEBIMENTO DOS DOCUMENTOS
→ CONFERÊNCIA DE INTEGRIDADE
→ CLASSIFICAÇÃO DAS OPERAÇÕES
→ ESCRITURAÇÃO FISCAL
→ CONFERÊNCIA DAS ENTRADAS
→ CONFERÊNCIA DAS SAÍDAS
→ APURAÇÕES ESPECIAIS
→ APURAÇÃO DO ICMS PRÓPRIO
→ AJUSTES / BENEFÍCIOS / ESTORNOS
→ CONCILIAÇÃO
→ REVISÃO
→ GERAÇÃO DA EFD
→ VALIDAÇÃO NO PVA
→ OBRIGAÇÕES ESTADUAIS
→ GERAÇÃO DAS GUIAS
→ APROVAÇÃO
→ PAGAMENTO
→ CONFERÊNCIA DO PAGAMENTO
→ FECHAMENTO DA COMPETÊNCIA
→ ARQUIVAMENTO / AUDITORIA
```

## Macroetapas (25)

| # | Macroetapa | Objetivo resumido |
| --- | --- | --- |
| 1 | Parametrização tributária | Matriz de empresa, produto, operação, ICMS, ST, FCP, DIFAL, crédito, CIAP e obrigações |
| 2 | Recebimento dos documentos | Base documental da competência consolidada (NF-e, NFC-e, CT-e, eventos, etc.) |
| 3 | Conferência de integridade | XML SEFAZ × sistema fiscal × documentos do cliente (Gate 1) |
| 4 | Classificação das operações | Natureza econômica da entrada/saída (crédito/débito) |
| 5 | Escrituração fiscal | XML/documento → regras → escrituração (CFOP, CST, bases, ST, DIFAL, FCP) |
| 6 | Conferência das entradas | Auditoria dos créditos por tipo de entrada |
| 7 | Controle do CIAP | Crédito de ativo permanente (Bloco G / G110) separado dos créditos comuns |
| 8 | Conferência das saídas | Auditoria dos débitos e cruzamento faturamento × documentos × escrituração × contabilidade |
| 9 | Separação das apurações | ICMS próprio, ICMS-ST, DIFAL/FCP, ICMS especial |
| 10 | Apuração do ICMS próprio | Conta gráfica (saldo anterior + créditos − débitos − deduções) → E110 |
| 11 | Ajustes da apuração | Cada ajuste com código, fundamento, valor, documento e responsável |
| 12 | ICMS-ST | Apuração por UF (E200/E210) |
| 13 | DIFAL e FCP | Apuração por UF origem/destino (E300/E310) |
| 14 | Antecipações e ICMS especiais | Tratamento específico por UF/operação |
| 15 | Conciliação da apuração | Folha com 13 cruzamentos a 100% |
| 16 | Gate de revisão | Analista executa; revisor valida cadeia completa (Gate 2) |
| 17 | Geração da EFD ICMS/IPI | Arquivo → PVA → validar → corrigir |
| 18 | Conferência do Bloco E | E100, E110–E116, E200/E210, E300/E310 |
| 19 | Obrigações estaduais | UF → obrigação → periodicidade → vencimento → responsável |
| 20 | Geração das guias | DAE/DAR, GNRE, ST, DIFAL, FCP, antecipação (Gate 3) |
| 21 | Aprovação final | Competência, CNPJ/IE, UF, receita, vencimento, valores |
| 22 | Pagamento | Enviar, acompanhar vencimento, receber comprovante |
| 23 | Fechamento definitivo | EFD + obrigações + guias + pagamento + dossiê → FECHADA |
| 24 | Retificação | Reabertura controlada, recalcular, documentar motivo |
| 25 | Dossiê mensal | Pasta por competência com 15 blocos de evidência |

## Status de workflow (19)

| Etapa | Status |
| --- | --- |
| 01 | Aguardando documentação |
| 02 | Documentação recebida |
| 03 | Conferência documental |
| 04 | Pendência documental |
| 05 | Escrituração |
| 06 | Conferência de entradas |
| 07 | Conferência de saídas |
| 08 | Análise tributária |
| 09 | Apurações especiais |
| 10 | Apuração preliminar |
| 11 | Pendência fiscal |
| 12 | Revisão da apuração |
| 13 | Apuração aprovada |
| 14 | Validação EFD |
| 15 | EFD transmitida |
| 16 | Guias geradas |
| 17 | Aguardando pagamento |
| 18 | Pagamento confirmado |
| 19 | Fechamento concluído |

## Fluxo final resumido

Documentos → Integridade → Classificação → Escrituração → Entradas/Créditos → Saídas/Débitos → CIAP + ST + DIFAL + FCP + Antecipações → Ajustes → ICMS próprio → Conciliação → Revisão → EFD → Obrigações estaduais → Guias → Pagamento → Fechamento → Auditoria/arquivo.
