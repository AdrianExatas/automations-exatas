---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia_andamento/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "f2cc5ec5ba5d9933666bbd535bc7fb90031a912a11ab91c94360d656f8df9936"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia_andamento/).

# Gerar Documento de Arrecadação para Declaração em Andamento

Gera o documento de arrecadação para uma declaração em andamento.

Identificação no Pedido de Dados

idSistema: DCTFWEB idServico: GERARGUIAANDAMENTO313

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório | Condicional |
| --- | --- | --- | --- | --- |
| categoria | Categoria declaração | String ou Number | SIM | Para o MIT deve ser considerada a categoria 40 |
| anoPA | Ano período apuração | String | SIM |  |
| mesPA | Mês período apuração | String | SIM | Exceto categoria 41 GERAL_13o_SALARIO ou 51 PF_13o_SALARIO |
| diaPA | Dia período apuração | String | NÃO | Somente para categoria 45 ESPETACULO_DESPORTIVO |
| cnoAfericao | CNO - Número Obra | Number | NÃO | Somente para categoria 44 AFERICAO |
| numProcReclamatoria | Número do Processo - Reclamatória Trabalhista | String | NÃO | Somente para categoria 46 Reclamatória Trabalhista |
| idsSistemaOrigem | Lista de sistema(s) de origem das receitas. Quando informado, a guia será gerada contendo apenas as receitas oriundas do(s) sistema(s) de origem especificado(s). | Array | NÃO |  |

**Exemplos objeto "dados" variações por categoria:**

```text
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
"dados": "{\"categoria\":40,\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
"dados": "{\"categoria\": 50,\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
"dados": "{\"categoria\": \"ESPETACULO_DESPORTIVO\",\"anoPA\":\"2022\",\"mesPA\":\"05\",\"diaPA\":\"14\"}"
"dados": "{\"categoria\": 45,\"anoPA\":\"2022\",\"mesPA\":\"05\",\"diaPA\":\"14\"}"
"dados": "{\"categoria\": \"AFERICAO\",\"anoPA\":\"2022\",\"mesPA\":\"03\",\"cnoAfericao\": 28151}"
"dados": "{\"categoria\": 44,\"anoPA\":\"2022\",\"mesPA\":\"03\",\"cnoAfericao\": 28151}"
"dados": "{\"categoria\": \"GERAL_13o_SALARIO\",\"anoPA\":\"2022\"}"
"dados": "{\"categoria\": 41,\"anoPA\":\"2022\"}"
"dados": "{\"categoria\": \"PF_13o_SALARIO\",\"anoPA\":\"2022\"}"
"dados": "{\"categoria\": 51,\"anoPA\":\"2022\"}"
"dados": "{\"categoria\": \"RECLAMATORIA_TRABALHISTA\",\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"
"dados": "{\"categoria\":46,\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\",\"idsSistemaOrigem\":[8]}"
"dados": "{\"categoria\":40,\"anoPA\":\"2025\",\"mesPA\":\"01\",\"idsSistemaOrigem\":[1,8]}"
```

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "GERARGUIAANDAMENTO313",
"versaoSistema": "1.0",
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Código HTTP retornado no acionamento do serviço. | String |
| dados | Estrutura de dados de retorno. | String ( String escapada: PDFByteArrayBase64) |
| mensagens | Mensagens retornadas no acionamento do serviço. É um array de objetos compostos de código e texto da mensagem. | Array de Object |

Objeto dados:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| PDFByteArrayBase64 | Documento DARF no formato PDF. | String |

**Exemplo: json retorno**

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "GERARGUIAANDAMENTO313",
"versaoSistema": "1.0",
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
},
"status": 200,
"responseId": "8f380ff8-6099-4565-b433-c7fd65b7e8c1",
"responseDateTime": "2025-03-27T19:07:02.925Z",
"dados": "{\"PDFByteArrayBase64\":\"<BASE64_REMOVIDO_TAMANHO_150436>\"}",
"mensagens": [
{
"codigo": "[Sucesso-DCTFWEB]",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "[Aviso-DCTFWEB-MG11]",
"texto": "Emissor Guia Pagamento de DCTF em Andamento executado com sucesso."
}
]
}
```

**Layout de Mensagens**

Códigos de retorno para o campo "status" (Status HTTP)

| HTTP Code | HTTP Description | Descrição |
| --- | --- | --- |
| 200 | OK | Tudo funcionou como esperado e a validação dos dados foi realizada com sucesso. |
| 400 | Requisição inválida | Falha - dados inválidos na execução (Bad Request). |
| 404 | Não Encontrado | Falha - URL não encontrada (Not Found). |
| 500 | Erro no servidor | Erro - houve um erro interno não previsto (Internal Server Error). |

**Protocolos de Comunicação**

É possível integrar utilizando os seguintes protocolos para requisição/solicitação e resposta:

- RESTFUL/JSON;
- HTTPS.
