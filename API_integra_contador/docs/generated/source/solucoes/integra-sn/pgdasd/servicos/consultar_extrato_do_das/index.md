---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/consultar_extrato_do_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "14556174780ead5cc526b86facbd30452681ae5e6064c01e72f42eade362f790"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/consultar_extrato_do_das/).

# Consultar Extrato do DAS

Essa funcionalidade consulta um extrato detalhado específico do DAS gerado.

Identificação no Pedido de Dados

idSistema: PGDASD idServico: CONSEXTRATO16 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroDas | Número do DAS que se deseja fazer a consulta do Extrato. | String (17) | SIM |

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
"idSistema": "PGDASD",
"idServico": "CONSEXTRATO16",
"versaoSistema": "1.0",
"dados": "{ \"numeroDas\": \"07202136999997159\" }"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto ExtratoDas. | String |

Objeto: ExtratoDas

| Campo | Descrição | Tipo |
| --- | --- | --- |
| numeroDas | Número do DAS (Documento de Arrecadação do Simples Nacional). | String (17) |
| extrato | Estrutura de dados do Extrato do DAS. A saída é um PDF. | Object |

Objeto: ArquivoExtrato

| Campo | Descrição | Tipo |
| --- | --- | --- |
| nomeArquivo | Nome do arquivo do extrato para ser utilizado no processo de decodificação do base64. Ex. “extrato-pgdasd-{numeroDeclaracao}.pdf”. | String (50) |
| pdf | Obtém o arquivo em base 64 para conversão em PDF. | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno consultar extrato do DAS](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_extrato_do_das/)
