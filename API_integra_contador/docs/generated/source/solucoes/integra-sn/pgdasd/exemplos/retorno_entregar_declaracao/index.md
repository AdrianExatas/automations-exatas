---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_entregar_declaracao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6a80cc3be710a2fb6a1a2b58fa5eb4523d02a89a59b0ff1a057f23e06acab1c4"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_entregar_declaracao/).

# Exemplo de Json de retorno

Exemplo de uma declaração transmitida.

## Json de retorno completo

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
"dados": "{\"cnpjCompleto\":\"00000000000100\",\"pa\":202\"indicadorTransmissao\":true,\"indicadorComparacao\":true,\"declaraca{\"tipoDeclaracao\":1,\"receitaPaCompetenciaInterno\":10000\"receitaPaCompetenciaExterno\":0.00,\"receitaPaCaixaInterno\":n\"receitaPaCaixaExterno\":null,\"valorFixoIcms\":100.00,\"valorFixoIss\":n\"receitasBrutasAnteriores\":[{\"pa\":202001,\"valorInterno\":100\"valorExterno\":200.00},{\"pa\":202002,\"valorInterno\":300\"valorExterno\":0.00},{\"pa\":202003,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202004,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202005,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202006,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202007,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202008,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202009,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202010,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202011,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202012,\"valorInterno\":0\"valorExterno\":0.00}],\"folhasSalario\":[{\"pa\":202001,\"valor\":2000.{\"pa\":202002,\"valor\":2000.00},{\"pa\":202003,\"valor\":2000.{\"pa\":202004,\"valor\":2000.00},{\"pa\":202005,\"valor\":0.{\"pa\":202006,\"valor\":0.00},{\"pa\":202007,\"valor\":0.00},{\"pa\":202\"valor\":0.00},{\"pa\":202009,\"valor\":0.00},{\"pa\":202010,\"valor\":0.{\"pa\":202011,\"valor\":0.00},{\"pa\":202012,\"valor\":0.0\"naoOptante\":null,\"estabelecimentos\":[{\"cnpjCompleto\":\"000000000010\"atividades\":[{\"idAtividade\":1,\"valorAtividade\":4000\"receitasAtividade\":[{\"valor\":4000.00,\"codigoOutroMunicipio\":n\"outraUf\":null,\"isencoes\":[{\"codTributo\":1007,\"valor\":100\"identificador\":1}],\"reducoes\":[{\"codTributo\":1007,\"valor\":1500\"percentualReducao\":50.00,\"identificador\":\"qualificacoesTributarias\":[],\"exigibilidadesSuspensas\":null{\"idAtividade\":10,\"valorAtividade\":6000.00,\"receitasAtividad[{\"valor\":6000.00,\"codigoOutroMunicipio\":9701,\"outraUf\":\"D\"isencoes\":null,\"reducoes\":null,\"qualificacoesTributarias\":n\"exigibilidadesSuspensas\":null}]}]}]},\"valoresParaComparaca[{\"codigoTributo\":1001,\"valor\":23.20},{\"codigoTributo\":1\"valor\":18.20},{\"codigoTributo\":1004,\"valor\":66.{\"codigoTributo\":1005,\"valor\":14.43},{\"codigoTributo\":1\"valor\":222.64},{\"codigoTributo\":1007,\"valor\":100.{\"codigoTributo\":1010,\"valor\":120.60}]}"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PGDASD",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "Aviso-PGDASD-MSG_ISN_034",
"texto": "A declaração do período 04/2021 da empresa TESTE, CNPJ 00.000.0001-00 foi transmitida com sucesso. Entretanto, foi entregue fora do prao que ensejou a aplicação de multa. "
}
],
"dados": "{\"idDeclaracao\":\"00000000202104001\",\"dataHoraTransmissao\":\"20220803044803\",\"valoresDevidos\":[{\"codigoTributo\":1001,\"valor\":44.00},{\"codigoTributo\":1002,\"valor\":28.00},{\"codigoTributo\":1004,\"valor\":101.92},{\"codigoTributo\":1005,\"valor\":22.08},{\"codigoTributo\":1006,\"valor\":332.00},{\"codigoTributo\":1007,\"valor\":272.00}],\"declaracao\":\"<BASE64_REMOVIDO_TAMANHO_17520>\",\"recibo\":\"<BASE64_REMOVIDO_TAMANHO_10448>\",\"notificacaoMaed\":\"<BASE64_REMOVIDO_TAMANHO_13544>\",\"darf\":\"<BASE64_REMOVIDO_TAMANHO_105164>\",\"detalhamentoDarfMaed\":{\"periodoApuracao\":\"20210601\",\"numeroDocumento\":null,\"dataVencimento\":\"20220902\",\"dataLimiteAcolhimento\":\"20220902\",\"valores\":{\"principal\":25.00,\"multa\":0.00,\"juros\":0.00,\"total\":25.00},\"observacao1\":\"DARF válido para pagamento até o vencimento\",\"observacao2\":\"PGDAS-D v2.1.6\",\"observacao3\":null,\"composicao\":null}}"
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"idDeclaracao": "00000000202104001",
"dataHoraTransmissao": "20220803044803",
"valoresDevidos": [
{
"codigoTributo": 1001,
"valor": 44.0
},
{
"codigoTributo": 1002,
"valor": 28.0
},
{
"codigoTributo": 1004,
"valor": 101.92
},
{
"codigoTributo": 1005,
"valor": 22.08
},
{
"codigoTributo": 1006,
"valor": 332.0
},
{
"codigoTributo": 1007,
"valor": 272.0
}
],
"declaracao": "<BASE64_REMOVIDO_TAMANHO_17520>",
"recibo": "<BASE64_REMOVIDO_TAMANHO_10448>",
"notificacaoMaed": "<BASE64_REMOVIDO_TAMANHO_13544>",
"darf": "<BASE64_REMOVIDO_TAMANHO_105164>",
"detalhamentoDarfMaed": {
"periodoApuracao": "20210601",
"numeroDocumento": null,
"dataVencimento": "20220902",
"dataLimiteAcolhimento": "20220902",
"valores": {
"principal": 25.0,
"multa": 0.0,
"juros": 0.0,
"total": 25.0
},
"observacao1": "DARF válido para pagamento até o vencimento",
"observacao2": "PGDAS-D v2.1.6",
"observacao3": null,
"composicao": null
}
}
```
