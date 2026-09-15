---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_recibo/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "92b8c23b8cda2267f0334e9efa75dc2cfcd9b938e92f3f7d6a555cf804ebd990"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_recibo/).

# Consultar Recibo de transmissão

Consulta o recibo de transmissão de uma declaração

Identificação no Pedido de Dados

idSistema: DCTFWEB idServico: CONSRECIBO32

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
"dados": "{\"categoria\": \"RECLAMATORIA_TRABALHISTA\",\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"
"dados": "{\"categoria\":46,\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"
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
"idServico": "CONSRECIBO32",
"versaoSistema": "1.0",
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| dados | Estrutura de dados de retorno. | String ( String escapada: PDFByteArrayBase64) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um texto de tamanho 5 que representa um código interno do negócio. | Array de Object |

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
"idServico": "CONSRECIBO32",
"versaoSistema": "1.0",
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
},
"status": 200,
"dados":  "{\"PDFByteArrayBase64\":\"<BASE64_REMOVIDO_TAMANHO_15008>\"}",
"mensagens":[{
"codigo": "Aviso-DCTFWEB-MG11",
"texto": "Relatório de Recibo de Declaração executado com sucesso."
},{
"codigo": "Sucesso-DCTFWEB-MG00",
"texto": "Requisição efetuada com sucesso"
}]
}
```
