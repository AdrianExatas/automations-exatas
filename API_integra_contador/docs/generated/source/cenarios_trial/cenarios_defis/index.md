---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_defis/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "dc1ae3b80ab7c6a82b425838c2bcce3103f8234e2f79628dd8d52bf961fb1f85"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_defis/).

# Cenários DEFIS

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Entregar Defis

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
"idSistema": "DEFIS",
"idServico": "TRANSDECLARACAO141",
"dados": "{\"ano\":2021,\"situacaoEspecial\":null,\"inatividade\":2,\"empresa\":{\"ganhoCapital\":10.0,\"qtdEmpregadoInicial\":20,\"qtdEmpregadoFinal\":0,\"lucroContabil\":20.0,\"receitaExportacaoDireta\":10.0,\"comerciaisExportadoras\":[{\"cnpjCompleto\":\"00000000000000\",\"valor\":123.0}],\"socios\":[{\"cpf\":\"00000000000\",\"rendimentosIsentos\":50.0,\"rendimentosTributaveis\":20.0,\"participacaoCapitalSocial\":90.0,\"irRetidoFonte\":10.0}],\"participacaoCotasTesouraria\":10.0,\"ganhoRendaVariavel\":10.0,\"doacoesCampanhaEleitoral\":[{\"cnpjBeneficiario\":\"00000000000000\",\"tipoBeneficiario\":1,\"formaDoacao\":1,\"valor\":10.0}],\"estabelecimentos\":[{\"cnpjCompleto\":\"00000000000000\",\"totalDevolucoesCompras\":200.0,\"OperacoesInterestaduais\":[{\"Uf\":\"SP\",\"Valor\":15.0,\"TipoOperacao\":1}],\"IssRetidosFonte\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"PrestacaoServicosComunicacao\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"MudancasOutroMunicipio\":[],\"PrestacoesServicoTransporte\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"InformacaoOpcional\":{\"vendasRevendedorAmbulante\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"preparosComercializacaoRefeicoes\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"producoesRurais\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"aquisicoesProdutoresRurais\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"aquisicoesDispensadosInscricao\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"rateiosReceitaRegimeEspecial\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0,\"numeroRegime\":\"999999\"}],\"rateiosDecisaoJudicial\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0,\"identificacaoDecisao\":\"teste\"}],\"rateiosReceitaOutrosRateios\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0,\"origemExigencia\":\"teste\"}],\"saidaTransferenciaMercadoria\":20.0,\"autoInfracaoPago\":20.0},\"estoqueInicial\":10.0,\"estoqueFinal\":20.0,\"saldoCaixaInicial\":-100.0,\"saldoCaixaFinal\":-50.0,\"aquisicoesMercadoInterno\":20.0,\"importacoes\":50.0,\"totalEntradasPorTransferencia\":200.0,\"totalSaidasPorTransferencia\":200.0,\"totalDevolucoesVendas\":300.0,\"totalEntradas\":5000.0,\"totalDespesas\":10000.0}]},\"naoOptante\":null}"
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
"idSistema": "DEFIS",
"idServico": "TRANSDECLARACAO141",
"dados": "{\"ano\":2021,\"situacaoEspecial\":null,\"inatividade\":2\"empresa\":{\"ganhoCapital\":10.0,\"qtdEmpregadoInicial\":20\"qtdEmpregadoFinal\":0,\"lucroContabil\":20.0\"receitaExportacaoDireta\":10.0,\"comerciaisExportadoras\"[{\"cnpjCompleto\":\"00000000000000\",\"valor\":123.0}],\"socios\"[{\"cpf\":\"00000000000\",\"rendimentosIsentos\":50.0\"rendimentosTributaveis\":20.0,\"participacaoCapitalSocial\":90.0\"irRetidoFonte\":10.0}],\"participacaoCotasTesouraria\":10.0\"ganhoRendaVariavel\":10.0,\"doacoesCampanhaEleitoral\"[{\"cnpjBeneficiario\":\"00000000000000\",\"tipoBeneficiario\":1\"formaDoacao\":1,\"valor\":10.0}],\"estabelecimentos\"[{\"cnpjCompleto\":\"00000000000000\",\"totalDevolucoesCompras\":200.0\"OperacoesInterestaduais\":[{\"Uf\":\"SP\",\"Valor\":15.0\"TipoOperacao\":1}],\"IssRetidosFonte\":[{\"Uf\":\"SP\"\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"PrestacaoServicosComunicacao\"[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}]\"MudancasOutroMunicipio\":[],\"PrestacoesServicoTransporte\"[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}]\"InformacaoOpcional\":{\"vendasRevendedorAmbulante\":[{\"Uf\":\"SP\"\"CodigoMunicipio\":7107,\"Valor\":20.0}]\"preparosComercializacaoRefeicoes\":[{\"Uf\":\"SP\"\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"producoesRurais\"[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}]\"aquisicoesProdutoresRurais\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107\"Valor\":20.0}],\"aquisicoesDispensadosInscricao\":[{\"Uf\":\"SP\"\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"rateiosReceitaRegimeEspecial\"[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0\"numeroRegime\":\"999999\"}],\"rateiosDecisaoJudicial\":[{\"Uf\":\"SP\"\"CodigoMunicipio\":7107,\"Valor\":20.0,\"identificacaoDecisao\":\"teste\"}]\"rateiosReceitaOutrosRateios\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107\"Valor\":20.0,\"origemExigencia\":\"teste\"}]\"saidaTransferenciaMercadoria\":20.0,\"autoInfracaoPago\":20.0}\"estoqueInicial\":10.0,\"estoqueFinal\":20.0,\"saldoCaixaInicial\":-100.0\"saldoCaixaFinal\":-50.0,\"aquisicoesMercadoInterno\":20.0\"importacoes\":50.0,\"totalEntradasPorTransferencia\":200.0\"totalSaidasPorTransferencia\":200.0,\"totalDevolucoesVendas\":300.0\"totalEntradas\":5000.0,\"totalDespesas\":10000.0}]},\"naoOptante\":null}"
}
}'
```

## Consultar Declarações

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
"idSistema": "DEFIS",
"idServico": "CONSDECLARACAO142",
"dados": ""
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
"idSistema": "DEFIS",
"idServico": "CONSDECLARACAO142",
"dados": ""
}
}'
```

## Consultar Última Declaração e Recibo

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
"idSistema": "DEFIS",
"idServico": "CONSULTIMADECREC143",
"dados": "{\"ano\":2021}"
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
"idSistema": "DEFIS",
"idServico": "CONSULTIMADECREC143",
"dados": "{\"ano\":2021}"
}
}
'
```

## Consultar Declaração e Recibo

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
"idSistema": "DEFIS",
"idServico": "CONSDECREC144",
"dados": "{\"idDefis\":\"000000002021002\"}"
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
"idSistema": "DEFIS",
"idServico": "CONSDECREC144",
"dados": "{\"idDefis\":\"000000002021002\"}"
}
}
'
```
