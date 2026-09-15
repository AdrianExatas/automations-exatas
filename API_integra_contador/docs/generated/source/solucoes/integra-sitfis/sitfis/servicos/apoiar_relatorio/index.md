---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/servicos/apoiar_relatorio/"
sourceUpdatedAt: "1 de setembro de 2026 14:07:36 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "540b8e4e5b98cd2872d275eec77dcbcc837a63d3ac7feee619993e85d53eec0d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/servicos/apoiar_relatorio/).

# Solicitar protocolo do relatório de situação fiscal

Essa funcionalidade solicita o protocolo para emissão do relatório de situação fiscal.

Identificação no Pedido de Dados

idSistema: SITFIS idServico: SOLICITARPROTOCOLO91 versaoSistema: "2.0"

**Dados de Entrada**

Não tem informação a ser preenchida no campo "dados", o campo deve ser enviado vazio (ex.: "dados":"")

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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SITFIS",
"idServico": "SOLICITARPROTOCOLO91",
"versaoSistema": "2.0",
"dados": ""
}
}
```

Para testar com mais exemplos, substitua o campo contribuinte.numero e contribuinte.tipo por um dos seguintes valores:

| Tipo de Contribuinte | Número de Identificação do Contribuinte |
| --- | --- |
| 1 | 99999999999 |
| 2 | E0000161000121 |
| 2 | A0000177000110 |
| 2 | U0000169000166 |

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Número(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. | Lista de Texto |
| dados | Estrutura de dados de retorno. | Texto (SCAPED Texto JSON) |

No atributo dados, será retornado com os seguintes campos:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| protocoloRelatorio | Protocolo que deve ser utilizado para recuperar o relatório de situação fiscal. Este campo é retornado quando o status é 200 e mensagens contendo o aviso Aviso-Sitfis-AV01 . | Texto |
| tempoEspera | Tempo de espera em milissegundos (ms) estimado para acionar o serviço para obter o relatório. Este campo é retornado quando o status é 200 ou 503. | Inteiro |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno solicitar relatório](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_apoiar_relatorio/)
