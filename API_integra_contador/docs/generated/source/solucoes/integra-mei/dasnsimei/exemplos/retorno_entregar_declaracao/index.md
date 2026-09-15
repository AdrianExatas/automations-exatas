---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_entregar_declaracao/"
sourceUpdatedAt: "26 de agosto de 2026 19:58:59 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "26ba52bd8d1191902575212bcfbaf8889cdf5acbcf2081482798116c03309dc3"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_entregar_declaracao/).

# Exemplo de Json de retorno

**ATENÇÃO: A FUNCIONALIDADE AINDA NÃO ESTÁ DISPONÍVEL PARA CONTRATAÇÃO E PODE SOFRER ALTERAÇÕES**

## Json de retorno completo

```text
{
"contratante": {
"numero": "11111111111111",
"tipo": 2
},
"autorPedidoDados": {
"numero": "11111111111111",
"tipo": 2
},
"contribuinte": {
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "DASNSIMEI",
"idServico": "TRANSDECLARACAO151",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2025\",\"declaracao\":{\"valorReceitaComercio\":82000.0,\"valorReceitaServico\":0.0,\"indicadorEmpregado\":false}}"
},
"status": 200,
"responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
"responseDateTime": "2026-02-23T16:04:44.402Z",
"dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2025,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112025001\",\"dataTransmissao\":\"2026-08-26T12:03:22.7191485-03:00\",\"codigoTipoDeclaracao\":\"1\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112025001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_174252>\"}},\"multaAtrasoEntrega\":{\"notificacaoMaed\":{\"nomeArquivo\":\"DASNSIMEI-Notificacao-111111112025001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_135712>\"},\"darf\":{\"periodoApuracao\":\"20260601\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"24/09/2026\",\"dataLimiteAcolhimento\":\"24/09/2026\",\"observacao1\":\"Válidoparapagamentocomreduçãoaté24/09/2026\",\"observacao2\":\"\",\"observacao3\":\"\",\"valores\":{\"valorPrincipal\":25.4,\"valorTotal\":25.4},\"composicao\":[{\"periodoApuracao\":\"20260601\",\"codigo\":\"1506\",\"denominacao\":\"MULTAPORATRASONAENTREGADADASN-SIMEI\",\"valores\":{\"valorPrincipal\":25.4,\"valorTotal\":25.4}}],\"documento\":{\"nomeArquivo\":\"DASNSIMEI-DARF-MAED-111111112025001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_295816>\"}}}}"
"mensagens": [
{
"codigo": "[Aviso-DASNSIMEI-00000]",
"texto": "Declaração transmitida com sucesso."
}
]
}
```

## Json do campo "dados"

Nesse exemplo, o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"cnpjCompleto": "11111111111111",
"anoCalendario": 2025,
"nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
"ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
"idDeclaracao": "111111112025001",
"dataTransmissao": "2026-08-26T12:03:22.7191485-03:00",
"codigoTipoDeclaracao": "1",
"reciboEntrega": {
"numeroRecibo": "00000000000000000",
"recibo": {
"nomeArquivo": "DASNSIMEI-Recibo-111111112025001.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_174252>"
}
},
"multaAtrasoEntrega": {
"notificacaoMaed": {
"nomeArquivo": "DASNSIMEI-Notificacao-111111112025001.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_135712>"
},
"darf": {
"periodoApuracao": "20260601",
"numeroDocumento": "00000000000000000",
"dataVencimento": "24/09/2026",
"dataLimiteAcolhimento": "24/09/2026",
"observacao1": "Válido para pagamento com redução até 24/09/2026",
"observacao2": "",
"observacao3": "",
"valores": {
"valorPrincipal": 25.4,
"valorTotal": 25.4
},
"composicao": [
{
"periodoApuracao": "20260601",
"codigo": "1506",
"denominacao": "MULTA POR ATRASO NA ENTREGA DA DASN - SIMEI",
"valores": {
"valorPrincipal": 25.4,
"valorTotal": 25.4
}
}
],
"documento": {
"nomeArquivo": "DASNSIMEI-DARF-MAED-111111112025001.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_295816>"
}
}
}
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
