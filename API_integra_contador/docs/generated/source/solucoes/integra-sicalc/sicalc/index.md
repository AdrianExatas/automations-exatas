---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/"
sourceUpdatedAt: "23 de junho de 2026 19:14:31 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "a4f6a2bd0f4fc41e45456dad5e808f711761820ccacd7d805b60e2d1b4df5c8a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/).

# Introdução

## O que é o Integra SICALC?

O Sicalc foi desenvolvido para auxiliar o contribuinte no cálculo de acréscimos legais e emissão do Darf para pagamento de tributos federais administrados pela Secretaria Especial da Receita Federal do Brasil.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra Sicalc, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- contratante
- autor do pedido de dados
- contribuinte
- pedido de dados

⚠️ **Importante:** O sistema aceita contribuintes do tipo 1 (pessoa física) e 2 (pessoa jurídica).

O Integra Contador estabelece um canal seguro de comunicação com o sistema SICALC, garantindo a integridade e a confidencialidade das informações transmitidas.
