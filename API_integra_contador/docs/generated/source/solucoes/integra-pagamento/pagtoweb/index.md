---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6daf0c25e26f70061cbef4773d4905f8747cf873d1967af2eb9687fa5fd29241"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/).

# Introdução

## O que é o Integra PAGTOWEB?

É uma solução integrada ao sistema PagtoWeb. Permite ao contribuinte a consulta dos seus pagamentos e saldo e a emissão de Comprovantes de Pagamento, instrumento que garante que o documento está pago e armazenado nas bases de dados da Receita Federal.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra Pagamento, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita contribuintes do tipo 1 (Pessoa Física) e 2 (Pessoa Jurídica).

O Integra Contador estabelece um canal seguro de comunicação com o sistema PAGTOWEB, garantindo a integridade e a confidencialidade das informações transmitidas.
