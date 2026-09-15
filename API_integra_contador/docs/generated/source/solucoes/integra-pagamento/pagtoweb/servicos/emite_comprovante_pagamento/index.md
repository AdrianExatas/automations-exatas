---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/emite_comprovante_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "dfb638b2ac13eda21fa6bcf7c18ac63551152ae6b56f2530673f5c42e0455c10"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/emite_comprovante_pagamento/).

# Emite Comprovante Pagamento

Esse método retorna o comprovante de pagamento.

PedidoDados

idSistema: PAGTOWEB idServico: COMPARRECADACAO72 versaoSistema: "1.0"

**Dados de Entrada**

Objeto ParametroEmissaoComprovanteIC:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroDocumento | Número do documento. | String (até 17 bytes) | SIM |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999",
"tipo": 1    },
"contribuinte": {
"numero": "99999999999",
"tipo": 1    },
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "COMPARRECADACAO72",
"dados": "{\"numeroDocumento\": \"99999999999999999\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. | Array |
| dados | PDF codificado em Base64 | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [Emite Comprovante Pagamento](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_emite_comprovante_pagamento/)
