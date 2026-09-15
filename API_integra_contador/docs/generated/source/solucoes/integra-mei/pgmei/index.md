---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "34d5361c9d70278c82d98f64d62f0de4ee7782624b550d61b8856a7571dafce6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/).

# Introdução

## O que é o Integra PGMEI?

O PGMEI - Programa Gerador do DAS para o MEI - é um sistema eletrônico que permite realizar a apuração, gerar o Documento de Arrecadação do Simples Nacional (DAS) para o Microempreendedor Individual (MEI) e consultar pendências de dívida Ativa.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra PGMEI, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema PGMEI, garantindo a integridade e a confidencialidade das informações transmitidas.
