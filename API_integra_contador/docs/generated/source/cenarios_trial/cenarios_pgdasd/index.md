---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_pgdasd/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "84113ddc45a7d07a8f424fbad260bb631bfa82650e5a347ad7c443e405e7ee67"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_pgdasd/).

# Cenários PGDAS-D

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Consultar Declarações Transmitidas por Ano-Calendário ou Período de Apuração

Esta simulação lista um índice com todas as declarações transmitidas no ano-calendário indicado.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idServico": "CONSDECLARACAO13",
"versaoSistema": "1.0",
"dados": "{ \"anoCalendario\": \"2018\" }"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Consultar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idServico": "CONSDECLARACAO13",
"versaoSistema": "1.0",
"dados": "{ \"anoCalendario\": \"2018\" }"
}
}'
```

## Gerar DAS

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idSistema": "PGDASD",
"idServico": "GERARDAS12",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"201801\" }"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Emitir' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idSistema": "PGDASD",
"idServico": "GERARDAS12",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"201801\" }"
}
}'
```

## Consultar a Última Declaração/Recibo

Consulta a última declaração transmitida/recibo de entrega da declaração por período de apuração.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idServico": "CONSULTIMADECREC14",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"201801\" }"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Consultar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idServico": "CONSULTIMADECREC14",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"201801\" }"
}
}'
```

## Consultar Declaração/Recibo

Consulta uma declaração transmitida/recibo de entrega da declaração por número de declaração.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idServico": "CONSDECREC15",
"versaoSistema": "1.0",
"dados": "{ \"numeroDeclaracao\": \"00000000201801001\" }"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Consultar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idServico": "CONSDECREC15",
"versaoSistema": "1.0",
"dados": "{ \"numeroDeclaracao\": \"00000000201801001\" }"
}
}'
```

## Consultar Extrato do DAS

Consulta o extrato da apuração do DAS por número de DAS.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Consultar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
}'
```

## Entregar Declaração

Entregar uma declaração do PGDASD.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idSistema": "PGDASD",
"idServico": "TRANSDECLARACAO11",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"00000000000100\",\"pa\":202101,\"indicadorTransmissao\":true,\"indicadorComparacao\":true,\"declaracao\":{\"tipoDeclaracao\":1,\"receitaPaCompetenciaInterno\":10000.00,\"receitaPaCompetenciaExterno\":0.00,\"receitaPaCaixaInterno\":null,\"receitaPaCaixaExterno\":null,\"valorFixoIcms\":100.00,\"valorFixoIss\":null,\"receitasBrutasAnteriores\":[{\"pa\":202001,\"valorInterno\":100.00,\"valorExterno\":200.00},{\"pa\":202002,\"valorInterno\":300.00,\"valorExterno\":0.00},{\"pa\":202003,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202004,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202005,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202006,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202007,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202008,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202009,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202010,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202011,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202012,\"valorInterno\":0.00,\"valorExterno\":0.00}],\"folhasSalario\":[{\"pa\":202001,\"valor\":2000.00},{\"pa\":202002,\"valor\":2000.00},{\"pa\":202003,\"valor\":2000.00},{\"pa\":202004,\"valor\":2000.00},{\"pa\":202005,\"valor\":0.00},{\"pa\":202006,\"valor\":0.00},{\"pa\":202007,\"valor\":0.00},{\"pa\":202008,\"valor\":0.00},{\"pa\":202009,\"valor\":0.00},{\"pa\":202010,\"valor\":0.00},{\"pa\":202011,\"valor\":0.00},{\"pa\":202012,\"valor\":0.00}],\"naoOptante\":null,\"estabelecimentos\":[{\"cnpjCompleto\":\"0000000000100\",\"atividades\":[{\"idAtividade\":1,\"valorAtividade\":4000.00,\"receitasAtividade\":[{\"valor\":4000.00,\"codigoOutroMunicipio\":null,\"outraUf\":null,\"isencoes\":[{\"codTributo\":1007,\"valor\":100.00,\"identificador\":1}],\"reducoes\":[{\"codTributo\":1007,\"valor\":1500.00,\"percentualReducao\":50.00,\"identificador\":1}],\"qualificacoesTributarias\":[],\"exigibilidadesSuspensas\":null}]},{\"idAtividade\":10,\"valorAtividade\":6000.00,\"receitasAtividade\":[{\"valor\":6000.00,\"codigoOutroMunicipio\":9701,\"outraUf\":\"DF\",\"isencoes\":null,\"reducoes\":null,\"qualificacoesTributarias\":null,\"exigibilidadesSuspensas\":null}]}]}]},\"valoresParaComparacao\":[{\"codigoTributo\":1001,\"valor\":23.20},{\"codigoTributo\":1002,\"valor\":18.20},{\"codigoTributo\":1004,\"valor\":66.53},{\"codigoTributo\":1005,\"valor\":14.43},{\"codigoTributo\":1006,\"valor\":222.64},{\"codigoTributo\":1007,\"valor\":100.00},{\"codigoTributo\":1010,\"valor\":120.60}]}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Declarar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idSistema": "PGDASD",
"idServico": "TRANSDECLARACAO11",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"00000000000100\",\"pa\":20210\"indicadorTransmissao\":true,\"indicadorComparacao\":true,\"declaracao\{\"tipoDeclaracao\":1,\"receitaPaCompetenciaInterno\":10000.0\"receitaPaCompetenciaExterno\":0.00,\"receitaPaCaixaInterno\":nul\"receitaPaCaixaExterno\":null,\"valorFixoIcms\":100.00,\"valorFixoIss\":nul\"receitasBrutasAnteriores\":[{\"pa\":202001,\"valorInterno\":100.0\"valorExterno\":200.00},{\"pa\":202002,\"valorInterno\":300.00,\"valorExterno\":00},{\"pa\":202003,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202005,\"valorInterno\":0.0\"valorExterno\":0.00},{\"pa\":202006,\"valorInterno\":0.00,\"valorExterno\":0.00{\"pa\":202007,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":202009,\"valorInterno\":0.0\"valorExterno\":0.00},{\"pa\":202010,\"valorInterno\":0.00,\"valorExterno\":0.00{\"pa\":202011,\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20201\"valorInterno\":0.00,\"valorExterno\":0.00}],\"folhasSalario\":[{\"pa\":20200\"valor\":2000.00},{\"pa\":202002,\"valor\":2000.00},{\"pa\":202003,\"valor\":20000},{\"pa\":202004,\"valor\":2000.00},{\"pa\":202005,\"valor\":0.00{\"pa\":202006,\"valor\":0.00},{\"pa\":202007,\"valor\":0.00},{\"pa\":20200\"valor\":0.00},{\"pa\":202009,\"valor\":0.00},{\"pa\":202010,\"valor\":0.00{\"pa\":202011,\"valor\":0.00},{\"pa\":202012,\"valor\":0.00}],\"naoOptante\":nul\"estabelecimentos\":[{\"cnpjCompleto\":\"0000000000100\",\"atividades\[{\"idAtividade\":1,\"valorAtividade\":4000.00,\"receitasAtividade\[{\"valor\":4000.00,\"codigoOutroMunicipio\":null,\"outraUf\":null,\"isencoes\[{\"codTributo\":1007,\"valor\":100.00,\"identificador\":1}],\"reducoes\[{\"codTributo\":1007,\"valor\":1500.00,\"percentualReducao\":50.0\"identificador\":1}],\"qualificacoesTributarias\":[\"exigibilidadesSuspensas\":null}]},{\"idAtividade\":10,\"valorAtividade\":6000.0\"receitasAtividade\":[{\"valor\":6000.00,\"codigoOutroMunicipio\":970\"outraUf\":\"DF\",\"isencoes\":null,\"reducoes\":nul\"qualificacoesTributarias\":null,\"exigibilidadesSuspensas\":null}]}]}]\"valoresParaComparacao\":[{\"codigoTributo\":1001,\"valor\":23.20{\"codigoTributo\":1002,\"valor\":18.20},{\"codigoTributo\":1004,\"valor\":66.53{\"codigoTributo\":1005,\"valor\":14.43},{\"codigoTributo\":1006,\"valor\":222.64{\"codigoTributo\":1007,\"valor\":100.00},{\"codigoTributo\":1010,\"valor\":1260}]}"
}
}'
```

## Gerar DAS Avulso

Gerar um DAS Avulso

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idServico": "GERARDASAVULSO19",
"versaoSistema": "1.0",
"dados": "{\"PeriodoApuracao\":202401,\"ListaTributos\":[{\"Codigo\":101\"Valor\":111.22,\"CodMunicipio\":0375,\"uf\":\"PA\"},{\"Codigo\":100\"Valor\":20.50,\"uf\":\"RJ\"},{\"Codigo\":1001,\"Valor\":100}]}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Emitir' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idServico": "GERARDASAVULSO19",
"versaoSistema": "1.0",
"dados": "{\"PeriodoApuracao\":202401,\"ListaTributos\":[{\"Codigo\":101\"Valor\":111.22,\"CodMunicipio\":0375,\"uf\":\"PA\"},{\"Codigo\":100\"Valor\":20.50,\"uf\":\"RJ\"},{\"Codigo\":1001,\"Valor\":100}]}"
}
}'
```

## Gerar DAS Cobrança

Gerar um DAS Cobrança

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idServico": "GERARDASCOBRANCA17",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"202301\" }"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Emitir' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idServico": "GERARDASCOBRANCA17",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"202301\" }"
}
}'
```

## Gerar DAS de Processo

Gerar um DAS de Processo

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idServico": "GERARDASPROCESSO18",
"versaoSistema": "1.0",
"dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Emitir' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idServico": "GERARDASPROCESSO18",
"versaoSistema": "1.0",
"dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
}
}'
```
