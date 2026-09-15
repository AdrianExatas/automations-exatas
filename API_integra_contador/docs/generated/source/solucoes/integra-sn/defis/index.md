---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d3786749e0fc7ca17f620fb4e26c65432a64184835e6b86e0cf4554a011bfffe"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/).

# Introdução

## O que é o Integra DEFIS?

É uma solução integrada ao sistema DEFIS que permite efetuar a Declaração de Informações Socioeconômicas e Fiscais (DEFIS), conforme determina a Lei Complementar nº 123, de 2006, art. 25, caput e a Resolução CGSN nº 140/2018

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra DEFIS, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema DEFIS, garantindo a integridade e a confidencialidade das informações transmitidas.
