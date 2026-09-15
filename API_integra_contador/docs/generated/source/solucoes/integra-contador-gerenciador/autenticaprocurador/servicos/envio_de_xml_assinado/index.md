---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/servicos/envio_de_xml_assinado/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "93f1e6ef954b45e46c2837221d9f8f2dcce2b6ad095b816c2e197e4d407f295b"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/servicos/envio_de_xml_assinado/).

# Envio de XML assinado com o Termo de Autorização

Permite o envio de um documento XML assinado digitalmente pelo Autor Pedido de Dados (Procurador) para receber um TOKEN de autorização que permite o Contratante realizar as requisições em nome do Autor Pedido de Dados.

Esse documento XML tem como conteúdo um TERMO DE AUTORIZAÇÃO estruturado na síntaxe XML que deve ser previamente assinado digitalmente por um assinador de documentos XML seguindo os padrões indicados na sessão [padrões técnicos de assinatura de XML](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/padroes_tecnicos_assinatura_xml/).

Identificação no Pedido de Dados

idSistema: AUTENTICAPROCURADOR idServico: ENVIOXMLASSINADO81 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| xml | Documento XML assinado previamente com certificado digital do Autor Pedido de Dados (eCPF ou eCNPJ - ICP-Brasil) nos padrões XMLDSig e codificado em base64 . | String escapada | Sim |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "AUTENTICAPROCURADOR",
"idServico": "ENVIOXMLASSINADO81",
"versaoSistema": "1.0",
"dados": "{\"xml\": \"<BASE64_REMOVIDO_TAMANHO_3259>\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma Texto de tamanho 5 que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno. | String escapada - Object : Autentica |

Object: Autentica

| Campo | Descrição | Tipo |
| --- | --- | --- |
| autenticar_procurador_token | Token de acesso para ser utilizado nas requisições do Integra Contador via http HEADER. | String |
| data_hora_expiracao | Data e hora da expiração do token. | String representando a data e hora. Formato: yyyy-MM-dd'T'HH:mm:ss |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno envio XML assinado e recebimento do token de acesso](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/exemplos/retorno_envio_xml_assinado/)
