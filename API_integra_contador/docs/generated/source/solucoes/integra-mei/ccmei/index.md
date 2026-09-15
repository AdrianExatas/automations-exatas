---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "117be3cfb65e95e394dc8e06b266ce12b659f33bc22b8623e75c9d10ef6850c6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/).

# Introdução

## O que é o Integra CCMEI?

O Certificado da Condição do Microempreendedor Individual (CCMEI) é o documento que certifica que sua empresa está aberta e comprova a sua inscrição no CNPJ e na Junta Comercial do seu Estado.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra CCMEI, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema CCMEI, garantindo a integridade e a confidencialidade das informações transmitidas.
