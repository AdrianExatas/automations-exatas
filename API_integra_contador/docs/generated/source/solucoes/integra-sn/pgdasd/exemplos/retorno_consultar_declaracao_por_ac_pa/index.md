---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_por_ac_pa/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "bc57b6d1d559c220c98e5886578346a4f2b1de99afd26f877dad072ba61d911f"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_por_ac_pa/).

# Exemplo de Json de retorno

Consultar índice de declarações por ano-calendário ou período de apuração.

## Json de retorno completo

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
},
"status": 200,
"dados": "{\"anoCalendario\":2018,\"periodos\":[{\"periodoApuracao\":20180\"operacoes\":[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201801001\\"dataHoraTransmissao\":\"20220331032512\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215764027873\\"datahoraEmissaoDas\":\"20220606033456\",\"dasPago\":false}}]{\"periodoApuracao\":201802,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201802001\\"dataHoraTransmissao\":\"20220331032533\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201802002\\"dataHoraTransmissao\":\"20220606033046\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215964030940\\"datahoraEmissaoDas\":\"20220608111510\",\"dasPago\":false}{\"tipoOperacao\":\"Geração de DAS\",\"indiceDeclaracao\":null,\"indiceDas\{\"numeroDas\":\"07202215964031106\\"datahoraEmissaoDas\":\"20220608112922\",\"dasPago\":false}}]{\"periodoApuracao\":201803,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201803001\\"dataHoraTransmissao\":\"20220331032551\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201803002\\"dataHoraTransmissao\":\"20220606033107\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201804,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201804001\\"dataHoraTransmissao\":\"20220331032613\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201804002\\"dataHoraTransmissao\":\"20220606033124\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201805,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201805001\\"dataHoraTransmissao\":\"20220331033215\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201805002\\"dataHoraTransmissao\":\"20220606033145\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201806,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201806001\\"dataHoraTransmissao\":\"20220331033333\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201806002\\"dataHoraTransmissao\":\"20220606033206\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215964032307\\"datahoraEmissaoDas\":\"20220608020457\",\"dasPago\":false}}]{\"periodoApuracao\":201807,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201807001\\"dataHoraTransmissao\":\"20220331033354\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201807002\\"dataHoraTransmissao\":\"20220606033230\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201808,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201808001\\"dataHoraTransmissao\":\"20220331033413\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201808002\\"dataHoraTransmissao\":\"20220606033248\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201809,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201809001\\"dataHoraTransmissao\":\"20220331033430\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201809002\\"dataHoraTransmissao\":\"20220606033305\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201810,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201810001\\"dataHoraTransmissao\":\"20220331033444\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201810002\\"dataHoraTransmissao\":\"20220606033329\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201811,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201811001\\"dataHoraTransmissao\":\"20220331033458\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201811002\\"dataHoraTransmissao\":\"20220606033349\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215964032170\\"datahoraEmissaoDas\":\"20220608020204\",\"dasPago\":false}}]{\"periodoApuracao\":201812,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201812001\\"dataHoraTransmissao\":\"20220331033515\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201812002\\"dataHoraTransmissao\":\"20220606033407\",\"malha\":\"\"\"indiceDas\":null}]}],\"mensagens\":null}",
"mensagens": [
{
"codigo": "Sucesso-PGDASD",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"anocalendario": 2018,
"periodos": [{
"periodoApuracao": 201801,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201801001",
"dataHoraTransmissao": "20220331032512",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Geração de DAS",
"indiceDeclaracao": null,
"indiceDas": {
"numeroDas": "07202219799007800",
"datahoraEmissaoDas": "20220606033456",
"dasPago": false
}
}]
}, {
"periodoApuracao": 201802,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201802001",
"dataHoraTransmissao": "20220331032533",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201802002",
"dataHoraTransmissao": "20220606033046",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Geração de DAS",
"indiceDeclaracao": null,
"indiceDas": {
"numeroDas": "07202215999990940",
"datahoraEmissaoDas": "20220608111510",
"dasPago": false
}
}, {
"tipoOperacao": "Geração de DAS",
"indiceDeclaracao": null,
"indiceDas": {
"numeroDas": "07202215999991106",
"datahoraEmissaoDas": "20220608112922",
"dasPago": false
}
}]
}, {
"periodoApuracao": 201803,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201803001",
"dataHoraTransmissao": "20220331032551",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201803002",
"dataHoraTransmissao": "20220606033107",
"malha": ""
},
"indiceDas": null
}]
}, {
"periodoApuracao": 201804,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201804001",
"dataHoraTransmissao": "20220331032613",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201804002",
"dataHoraTransmissao": "20220606033124",
"malha": ""
},
"indiceDas": null
}]
}, {
"periodoApuracao": 201805,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000990201805001",
"dataHoraTransmissao": "20220331033215",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201805002",
"dataHoraTransmissao": "20220606033145",
"malha": ""
},
"indiceDas": null
}]
}, {
"periodoApuracao": 201806,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201806001",
"dataHoraTransmissao": "20220331033333",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201806002",
"dataHoraTransmissao": "20220606033206",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Geração de DAS",
"indiceDeclaracao": null,
"indiceDas": {
"numeroDas": "07202219999992307",
"datahoraEmissaoDas": "20220608020457",
"dasPago": false
}
}]
}, {
"periodoApuracao": 201807,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201807001",
"dataHoraTransmissao": "20220331033354",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201807002",
"dataHoraTransmissao": "20220606033230",
"malha": ""
},
"indiceDas": null
}]
}, {
"periodoApuracao": 201808,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201808001",
"dataHoraTransmissao": "20220331033413",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201808002",
"dataHoraTransmissao": "20220606033248",
"malha": ""
},
"indiceDas": null
}]
}, {
"periodoApuracao": 201809,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201809001",
"dataHoraTransmissao": "20220331033430",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201809002",
"dataHoraTransmissao": "20220606033305",
"malha": ""
},
"indiceDas": null
}]
}, {
"periodoApuracao": 201810,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201810001",
"dataHoraTransmissao": "20220331033444",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201810002",
"dataHoraTransmissao": "20220606033329",
"malha": ""
},
"indiceDas": null
}]
}, {
"periodoApuracao": 201811,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201811001",
"dataHoraTransmissao": "20220331033458",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201811002",
"dataHoraTransmissao": "20220606033349",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Geração de DAS",
"indiceDeclaracao": null,
"indiceDas": {
"numeroDas": "07202215999999170",
"datahoraEmissaoDas": "20220608020204",
"dasPago": false
}
}]
}, {
"periodoApuracao": 201812,
"operacoes": [{
"tipoOperacao": "Original",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201812001",
"dataHoraTransmissao": "20220331033515",
"malha": ""
},
"indiceDas": null
}, {
"tipoOperacao": "Retificadora",
"indiceDeclaracao": {
"numeroDeclaracao": "00000000201812002",
"dataHoraTransmissao": "20220606033407",
"malha": ""
},
"indiceDas": null
}]
}]
}
```
