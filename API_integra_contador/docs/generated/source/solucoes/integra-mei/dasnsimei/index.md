---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/"
sourceUpdatedAt: "5 de maio de 2026 19:36:11 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "f53bbdb2ff46162387db776804443aab9356a94f57ef5d1a250a28bc2cc90604"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/).

# Introdução

## O que é DASN-SIMEI?

O programa da DASN-SIMEI - Declaração Anual Simplificada para o Microempreendedor Individual - é um sistema eletrônico que permite entrega da DASN-SIMEI pelo Microempreendedor Individual (MEI).

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra MEI DASN-SIMEI, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema DASN-SIMEI, garantindo a integridade e a confidencialidade das informações transmitidas.
