---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_xml_declaracao/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "03bf3578d7f41522ae390fa1ab0d6ac24a2fbce7751187e3ef6a80f0d39b3c3d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_xml_declaracao/).

# Consultar XML da declaração

Consulta o xml de uma declaração já trasmitida (e portanto já assinada), **ou** gera o xml de uma declaração EM ANDAMENTO, para posterior assinatura e transmissão a partir do serviço TRANSDECLARACAO310.

Identificação no Pedido de Dados

idSistema: DCTFWEB idServico: CONSXMLDECLARACAO38

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
| numProcReclamatoria | Número Processo Reclamatória | String | NÃO. Somente para categoria 46 Reclamatória Trabalhista. |

**Exemplos objeto "dados" variações por categoria:**

```text
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"08\"}"
"dados": "{\"categoria\": 40,\"anoPA\":\"2022\",\"mesPA\":\"08\"}"
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
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "CONSXMLDECLARACAO38",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| dados | Estrutura de dados de retorno. | String ( String escapada: XMLStringBase64) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um texto de tamanho 5 que representa um código interno do negócio. | Array de Object |

**Exemplo: json retorno**

```text
{
"contratante": {
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "CONSXMLDECLARACAO38",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
},
"status": 200,

"dados": "{\"XMLStringBase64\":\"<BASE64_REMOVIDO_TAMANHO_20236>\"}",
"mensagens": [
{
"codigo": "Aviso-DCTFWEB-MG11",
"texto": "Gerador Minuta XML Declaração executado com sucesso."
},{
"codigo": "Sucesso-DCTFWEB-MG00",
"texto": "Requisição efetuada com sucesso"
}
]
}
```
