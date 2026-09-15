---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "a44797c37687fcfd66470d55b01a97179c067ecc2e464e0e8d2193e87176b6bb"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/).

# Introdução

## O que é o Integra Procurações?

O Integra Procurações é um serviço de consulta de procurações eletrônicas do contribuinte. Ele provê as informações referentes a uma procuração eletrônica entre um outorgante titular e seu respectivo procurador. Este serviço facilita a consulta destas informações e dispensa a utilização do eCAC para esta mesma tarefa.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra Procurações, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita contribuintes do tipo 1 (Pessoa Física) e 2 (Pessoa Jurídica).

O Integra Contador estabelece um canal seguro de comunicação com o sistema PROCURACOES, garantindo a integridade e a confidencialidade das informações transmitidas.
