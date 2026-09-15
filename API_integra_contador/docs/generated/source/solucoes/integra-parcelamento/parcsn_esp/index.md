---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "247bb147d18bbfb63248046e1a6e819a073469f9df5063ce1d38d8c1c7bb1abf"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/).

# Introdução

## O que é o Integra Parcelamento?

É uma solução integrada ao sistema de Parcelamentos do Simples Nacional e MEI. Os sistemas de parcelamento permitem a realização de parcelamento ou reparcelamento de débitos apurados pelo Simples Nacional que estejam vencidos e em cobrança na Receita Federal do Brasil

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra Parcelamento, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema PARCSN-ESP, garantindo a integridade e a confidencialidade das informações transmitidas.
