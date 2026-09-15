---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ce56fe353c177ca279cee48315ff748a9b70c4afbf677f75a95833102555e088"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/).

# Introdução

## O que é o e-Processo?

O e-Processo - Sistema eletrônico de controle, gestão e julgamento de atos administrativos tributários digitais, sequenciais, que envolvem o crédito tributário e residualmente, por economia administrativa, de atos administrativos em geral do Conselho Administrativo de Recursos Fiscais (CARF), da Procuradoria Geral da Fazenda Nacional (PGFN) e da Receita Federal do Brasil (RFB).

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra-e-Processo, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita contribuintes do tipo 1 (Pessoa Física) ou tipo 2 (Pessoa Jurídica).

O Integra Contador estabelece um canal seguro de comunicação com o sistema e-Processo, garantindo a integridade e a confidencialidade das informações transmitidas.
