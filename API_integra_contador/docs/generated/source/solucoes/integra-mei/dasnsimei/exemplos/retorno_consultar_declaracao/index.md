---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_consultar_declaracao/"
sourceUpdatedAt: "7 de maio de 2026 12:28:23 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "235c0261c66930b128adec44066e91ef61d98a7443224b615332e6cf63a67495"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_consultar_declaracao/).

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
"idServico": "CONSULTIMADECREC152",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
},
"status": 200,
"responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
"responseDateTime": "2026-02-23T15:06:47.053Z",
"dados": "[{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"NOMEEMPRESARIAL\",\"idDeclaracao\":\"111111112022001\",\"dataTransmissao\":\"2023-01-09T10:46:17.49\",\"codigoTipoDeclaracao\":\"1\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_196960>\"}}},{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112022002\",\"dataTransmissao\":\"2024-10-23T09:26:45.17\",\"codigoTipoDeclaracao\":\"5\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022002.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_185056>\"}},\"excessoReceitaBruta\":{\"valorLimite\":251600.00,\"valorExcedido\":1027.38,\"apurado\":{\"valorInss\":49.94,\"valorIss\":36.82,\"valorTotal\":86.76},\"dasExcessoReceita\":{\"periodoApuracao\":\"202212\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"22/02/2023\",\"dataLimiteAcolhimento\":\"29/11/2024\",\"observacao1\":\"CPF:000.000.000-00\",\"observacao2\":\"INSS:49,94ICMS:0,00ISS:36,82\",\"valores\":{\"valorPrincipal\":86.76,\"valorMulta\":17.35,\"valorJuros\":17.29,\"valorTotal\":121.40},\"composicao\":[{\"periodoApuracao\":\"202212\",\"codigo\":\"0151\",\"denominacao\":\"INSS-SIMPLESNACIONAL-MEI\",\"valores\":{\"valorPrincipal\":49.94,\"valorMulta\":9.99,\"valorJuros\":9.95,\"valorTotal\":69.88}},{\"periodoApuracao\":\"202212\",\"codigo\":\"0125\",\"denominacao\":\"ISS-SIMPLESNACIONAL-MEI\",\"valores\":{\"valorPrincipal\":36.82,\"valorMulta\":7.36,\"valorJuros\":7.34,\"valorTotal\":51.52}}]}}},{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112022003\",\"dataTransmissao\":\"2025-04-16T10:30:19.51\",\"codigoTipoDeclaracao\":\"2\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_185056>\"}},\"multaAtrasoEntrega\":{\"notificacaoMaed\":{\"nomeArquivo\":\"DASNSIMEI-Notificacao-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_133464>\"},\"darf\":{\"periodoApuracao\":\"20230601\",\"dataVencimento\":\"16/05/2025\",\"dataLimiteAcolhimento\":\"16/05/2025\",\"observacao1\":\"DARFválidoparapagamentoatéovencimento\",\"observacao2\":\"\",\"observacao3\":\"DASNSIMEIv2.7.4.0\",\"valores\":{\"valorPrincipal\":77.54,\"valorTotal\":77.54},\"composicao\":[{\"periodoApuracao\":\"20230601\",\"codigo\":\"1506\",\"denominacao\":\"MULTAPORATRASONAENTREGADADASN-SIMEI\",\"valores\":{\"valorPrincipal\":77.54,\"valorTotal\":77.54}}],\"documento\":{\"nomeArquivo\":\"DASNSIMEI-DARF-MAED-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_295644>\"}}}}]",
"mensagens": [
{
"codigo": "[Aviso-DASNSIMEI-00000]",
"texto": "Consulta declaração transmitida realizada com sucesso."
}
]
}
```

## Json do campo "dados"

Nesse exemplo, o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[
{
"cnpjCompleto": "11111111111111",
"anoCalendario": 2022,
"nomeEmpresarial": "NOME EMPRESARIAL",
"idDeclaracao": "111111112022001",
"dataTransmissao": "2023-01-09T10:46:17.49",
"codigoTipoDeclaracao": "1",
"reciboEntrega": {
"numeroRecibo": "00000000000000000",
"recibo": {
"nomeArquivo": "DASNSIMEI-Recibo-111111112022001.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_196960>"
}
}
},
{
"cnpjCompleto": "11111111111111",
"anoCalendario": 2022,
"nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
"ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
"idDeclaracao": "111111112022002",
"dataTransmissao": "2024-10-23T09:26:45.17",
"codigoTipoDeclaracao": "5",
"reciboEntrega": {
"numeroRecibo": "00000000000000000",
"recibo": {
"nomeArquivo": "DASNSIMEI-Recibo-111111112022002.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_185056>"
}
},
"excessoReceitaBruta": {
"valorLimite": 251600.00,
"valorExcedido": 1027.38,
"apurado": {
"valorInss": 49.94,
"valorIss": 36.82,
"valorTotal": 86.76
},
"dasExcessoReceita": {
"periodoApuracao": "202212",
"numeroDocumento": "00000000000000000",
"dataVencimento": "22/02/2023",
"dataLimiteAcolhimento": "29/11/2024",
"observacao1": "CPF: 000.000.000-00",
"observacao2": "INSS: 49,94 ICMS: 0,00 ISS: 36,82",
"valores": {
"valorPrincipal": 86.76,
"valorMulta": 17.35,
"valorJuros": 17.29,
"valorTotal": 121.40
},
"composicao": [
{
"periodoApuracao": "202212",
"codigo": "0151",
"denominacao": "INSS - SIMPLES NACIONAL - MEI",
"valores": {
"valorPrincipal": 49.94,
"valorMulta": 9.99,
"valorJuros": 9.95,
"valorTotal": 69.88
}
},
{
"periodoApuracao": "202212",
"codigo": "0125",
"denominacao": "ISS - SIMPLES NACIONAL - MEI",
"valores": {
"valorPrincipal": 36.82,
"valorMulta": 7.36,
"valorJuros": 7.34,
"valorTotal": 51.52
}
}
]
}
}
},
{
"cnpjCompleto": "11111111111111",
"anoCalendario": 2022,
"nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
"ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
"idDeclaracao": "111111112022003",
"dataTransmissao": "2025-04-16T10:30:19.51",
"codigoTipoDeclaracao": "2",
"reciboEntrega": {
"numeroRecibo": "00000000000000000",
"recibo": {
"nomeArquivo": "DASNSIMEI-Recibo-111111112022003.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_185056>"
}
},
"multaAtrasoEntrega": {
"notificacaoMaed": {
"nomeArquivo": "DASNSIMEI-Notificacao-111111112022003.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_133464>"
},
"darf": {
"periodoApuracao": "20230601",
"dataVencimento": "16/05/2025",
"dataLimiteAcolhimento": "16/05/2025",
"observacao1": "DARF válido para pagamento até o vencimento",
"observacao2": "",
"observacao3": "DASNSIMEI v2.7.4.0",
"valores": {
"valorPrincipal": 77.54,
"valorTotal": 77.54
},
"composicao": [
{
"periodoApuracao": "20230601",
"codigo": "1506",
"denominacao": "MULTA POR ATRASO NA ENTREGA DA DASN - SIMEI",
"valores": {
"valorPrincipal": 77.54,
"valorTotal": 77.54
}
}
],
"documento": {
"nomeArquivo": "DASNSIMEI-DARF-MAED-111111112022003.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_295644>"
}
}
}
}
]
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
