---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "c850162295a2708bc2826b7343e86a8e5e0d09b494f0b7ef347b461cea9234b4"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/).

# Introdução

## O que é o IC-CXPOSTAL?

O Sistema Integra Contador Caixa Postal (IC-CXPOSTAL) é uma solução que permite o acesso a informações da Caixa Postal por meio de uma API (Application Programming Interface), voltada para integração com sistemas externos.

Esse modelo de acesso busca substituir abordagens baseadas em Web Scraping, que podem se tornar instáveis devido a mudanças frequentes na interface do sistema original e impactar o desempenho de plataformas como o e-CAC.

A API disponibiliza três funcionalidades básicas para consulta e tratamento das mensagens eletrônicas da Caixa Postal:

- Obter lista de mensagens por contribuintes;
- Obter detalhes de uma mensagem específica;
- Obter indicador de novas mensagens;

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra CaixaPostal, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita contribuintes do tipo 1 (Pessoa Física) e 2 (Pessoa Jurídica).

O Integra Contador estabelece um canal seguro de comunicação com o sistema CAIXAPOSTAL, garantindo a integridade e a confidencialidade das informações transmitidas.
