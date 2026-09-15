---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/integra_contador/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "58f7d51a81f7e1a5bef2c0a99e7180003013735d762401e926682414bd9db86a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/integra_contador/).

# Integra Contador

## Base URL

Base URL do endereço da Loja de APIs do Serpro:

[https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/](https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/)

**IMPORTANTE**

Acesse a seção do swagger de [Demonstração](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/demonstracao/) para experimentar a API.

## Caminhos

Os caminhos para acionar qualquer serviço de negócio estão organizados nos tipos definidos logo abaixo.

### Apoiar

Este tipo refere-se aos serviços auxiliares ou de suporte.

URL: [https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Apoiar](https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Apoiar)

### Consultar

É o caminho para os serviços do tipo consulta.

URL: [https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar](https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar)

### Declarar

Este tipo refere-se aos serviços de entrega ou transmissão de declaração.

URL: [https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Declarar](https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Declarar)

### Emitir

É o caminho para os serviços relacionados a emissão de comprovantes, relatórios, guia de recolhimento ou documento de arrecadação.

URL: [https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Emitir](https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Emitir)

### Monitorar

Este tipo refere-se aos serviços de monitoração.

URL: [https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Monitorar](https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Monitorar)

**Informação**

Acesse a seção do [Catálogo de Serviços](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/catalogo_de_servicos/) para descobrir todos os serviços e o tipo de caminho que deve ser utilizado.

## Padrões

- RESTFUL/JSON (JavaScript Object Notation);
- Application/json;
- URL HTTPS;
- Método: POST;
- camelCase;
- Encode UTF-8;
- SCAPED STRING para o json do objeto "dados", exemplo:

```text
{
"dados": "{\"cnpjBasico\": \"23478643\", \"pa\": \"202001\", \"dataConsolidacao\": null}"
}
```

## Body

O corpo da mensagem de entrada é representado por um objeto JSON com a seguinte estrutura obrigatória:

```text
{
"contratante": {
"numero": "string",
"tipo": 1
},
"autorPedidoDados": {
"numero": "string",
"tipo": 1
},
"contribuinte": {
"numero": "string",
"tipo": 1
},
"pedidoDados": {
"idSistema": "string",
"idServico": "string",
"versaoSistema": "string",
"dados": "string"
}
}
```

Objeto Contratante:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numero | Número do CNPJ completo (incluindo o DV) do contratante do produto na Loja Serpro. Só são aceitos números e sem a máscara de formatação. | String (14) | SIM |
| tipo | Tipo do NI. Só é aceito o valor 2 que significa que o tipo do NI (número indicador) é CNPJ. | Number (1) | SIM |

Objeto AutorPedidoDados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numero | Autor da requisição com o pedido de dados. Pode ser o próprio Contratante, Procurador ou Contribuinte. Esse campo aceita um número de CPF ou CNPJ completo (incluindo o DV). Só são aceitos números e sem a máscara de formatação. | String (11) - CPF / String (14) - CNPJ | SIM |
| tipo | Tipo do NI. Tipo 1 representa o CPF e tipo 2 é CNPJ. | Number (1) | SIM |

Objeto Contribuinte:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numero | Número do CNPJ completo (incluindo o DV) do Contribuinte que está sendo realizado alguma operação de obrigação fiscal ou consulta de dados. Esse campo aceita um número de CPF ou CNPJ completo (incluindo o DV). Só são aceitos números e sem a máscara de formatação. | String (11) - CPF / String (14) - CNPJ | SIM |
| tipo | Tipo do NI. Tipo 1 representa o CPF e tipo 2 é CNPJ. Em serviços com envio de contribuinte em lote ou lista é representado por tipo 3 lista de PF e tipo 4 lista PJ. | Number (1) | SIM |

Objeto PedidoDados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| idSistema | Identificador do sistema. | String | SIM |
| idServico | Identificador do serviço que contém a funcionalidade do sistema. | String | SIM |
| versaoSistema | Versão do sistema acionado | String | SIM |
| dados | Contém os parâmetros de entrada no sistema acionado. | String (SCAPED STRING JSON) | SIM |
