---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "55ee7f4002e403a7839f881a9f46dab1832d552c61b7536afa9970ba4563f1ef"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/).

# Introdução

## O que é o Integra Regime de Apuração de Receitas?

É uma solução integrada ao sistema de Regime de Apuração de Receitas que é um recurso eletrônico para a realização e consulta da opção de regime, conforme determina a Lei Complementar nº 123, de 14 de dezembro de 2006 (e alterações) e Resolução CGSN nº 140, de 22 de maio de 2018.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra Regime de Apuração de Receitas, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema REGIMEAPURACAO, garantindo a integridade e a confidencialidade das informações transmitidas.
