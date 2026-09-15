---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "fa43e811d71abdbf0c9d72e6341995bc35ebb15be9450e145b20da260879a760"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/).

# Introdução

## O que é o Integra SITFIS?

É uma solução integrada ao sistema Situação Fiscal que é um sistema que fornece um relatório de situação Fiscal do contribuintes Pessoa Jurídica e Pessoa Física, no âmbito da Receita Federal do Brasil e Procuradoria-Geral da Fazenda Nacional, conforme [Portaria RFB/PGFN n° 1.751, de 02/10/2014](http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=56753).

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra SITFIS, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita contribuintes do tipo 1 (Pessoa Física) e 2 (Pessoa Jurídica).

O Integra Contador estabelece um canal seguro de comunicação com o sistema SITFIS, garantindo a integridade e a confidencialidade das informações transmitidas.
