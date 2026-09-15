---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d78151789913304f5344b4b14b7948936e371dd199ef8a640b8883dc0c042bbd"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/).

# Introdução

## O que é o IC-DTE?

O Sistema Integra Contador DTE (IC-DTE) disponibiliza um serviço de consulta à situação do contribuinte quanto à adesão ao DTE - Domicílio Tributário Eletrônico, no Caixa Postal do Simples Nacional e no e-CAC, a partir de uma API (Application Programming Interface).

Em cada chamada do serviço, serão informados os dados a respeito do autor da consulta e do contribuinte da mensagem e haverá um retorno on-line, indicando o sucesso ou falha da consulta.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra CaixaPostal, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema DTE, garantindo a integridade e a confidencialidade das informações transmitidas.
