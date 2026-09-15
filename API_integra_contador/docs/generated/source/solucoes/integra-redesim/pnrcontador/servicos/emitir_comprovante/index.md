---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/emitir_comprovante/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "22ac6555fb28eb079fd9c82d1400856a65113edc66b52ce642966ea23e9806ab"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/emitir_comprovante/).

# Emitir Comprovante

Este serviço permite a emissão de um comprovante de renúncia em formato PDF.

Identificação no Pedido de Dados

idSistema: PNRCONTADOR idServico: COMPRENUNCIA264

**Dados de Entrada**

Para realizar a emissão do comprovante, é necessário que o `autorPedidoDados` informado na requisição, seja solicitante ou renunciante da renúncia informada no campo `pedidoDados.dados.idRenuncia`.

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| idRenuncia | ID da renúncia para emissão de comprovante. Pode ser recuperada com o serviço de Consultar Renúncias . Deve ser uma renúncia do contribuinte informado. | Número | SIM |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000100",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "COMPRENUNCIA264",
"versaoSistema": "1.0",
"dados": "{ \"idRenuncia\": 2558 }"
}
}
```

**Dados de Saída**

O retorno é o comprovante de renúncia, em PDF codificado em Base64.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Número(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Lista de Texto |
| dados | PDF do comprovante codificado em Base64 | Texto |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Emitir Comprovante](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_emitir_comprovante/)
