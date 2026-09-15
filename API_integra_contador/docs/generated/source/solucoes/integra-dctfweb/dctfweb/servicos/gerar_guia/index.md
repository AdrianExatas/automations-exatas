---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "5ac2d90c143b7aee52fb6bbc106ce3d351260976477b013b2a57ae7555e26da0"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia/).

# Gerar Documento de Arrecadação

Gera o documento de arrecadação para uma declaração na situação ATIVA

Identificação no Pedido de Dados

idSistema: DCTFWEB idServico: GERARGUIA31

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| categoria | Categoria declaração | String ou Number | SIM |
| anoPA | Ano período apuração | String | SIM |
| mesPA | Mês período apuração | String | SIM. Exceto categoria 41 GERAL_13o_SALARIO ou 51 PF_13o_SALARIO |
| diaPA | Dia período apuração | String | NÃO. Somente para categoria 45 ESPETACULO_DESPORTIVO |
| cnoAfericao | Número Obra | Number | NÃO. Somente para categoria 44 AFERICAO |
| numeroReciboEntrega | Número Recibo de entrega | Number | NÃO. Caso não informado a funcionalidade será executada para a declaração mais recente. |
| numProcReclamatoria | Número Processo Reclamatória | String | NÃO. Somente para categoria 46 Reclamatória Trabalhista |
| DataAcolhimentoProposta | Inteiro (não string). Dia útil (no município associado ao contribuinte) do mês corrente maior ou igual ao dia de hoje, no formato aaaammdd, para pagamento da guia. Segue as mesmas regras do DCTF Web (opção "editar DARF") para proposição de data de acolhimento/pagamento. Veja como exemplo o objeto "dados" para a categoria RECLAMATORIA_TRABALHISTA abaixo. Ele assume que o mês corrente é julho de 2023, pagando uma guia atrasada e escolhendo a data de pagamento 31/07/2023 (último dia útil do mês). | Number | NÃO |
| idsSistemaOrigem | Lista de sistema(s) de origem das receitas. Quando informado, a guia será gerada contendo apenas as receitas oriundas do(s) sistema(s) de origem especificado(s). | Array | NÃO |

**Exemplos objeto "dados" variações por categoria:**

```text
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
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
"dados": "{\"categoria\": \"RECLAMATORIA_TRABALHISTA\",\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\",\"DataAcolhimentoProposta\": 20230731}"
"dados": "{\"categoria\":46,\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\",\"idsSistemaOrigem\":[8]}"
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\",\"idsSistemaOrigem\":[1,8]}"
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
"idServico": "GERARGUIA31",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
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
"idServico": "GERARGUIA31",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
},
"status": 200,
"dados":  "{\"PDFByteArrayBase64\":\"<BASE64_REMOVIDO_TAMANHO_224836>\"}",
"mensagens": [
{
"codigo": "Aviso-DCTFWEB-MG11",
"texto": "Emissor Guia Pagamento executado com sucesso."
},{
"codigo": "Sucesso-DCTFWEB-MG00",
"texto": "Requisição efetuada com sucesso"
}
]
}
```
