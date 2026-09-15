---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/exemplos/saida_obter_procuracao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b2d93c54f4958124bc75cfe18d7892e96f111bcb1b14d655e8776768bab294fb"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/exemplos/saida_obter_procuracao/).

# Exemplo de Json de retorno

Obter Procuração

## Json de retorno completo

```text
{
"contratante": {
"numero": "99999999999",
"tipo": 1
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PROCURACOES",
"idServico": "OBTERPROCURACAO41",
"versaoSistema": "1",
"dados": "{ \"outorgante\":\"99999999999\", \"tipoOutorgante\": \"1\"\"outorgado\":\"99999999999999\", \"tipoOutorgado\":\"2\" }"
},
"status": 200,
"dados": "[{\"dtexpiracao\":\"20230414\", \"nrsistemas\":2,\"sistemas\[\"Caixa Postal - Mensagens\",\"Caixa Postal - Termo de Opção pelo DomicíliTributário Eletrônico\"]},{\"dtexpiracao\":\"20221231\", \"nrsistemas\":\"sistemas\":[\"Declarações - DIRPF\",\"Meu Imposto de Renda\",\"Opção dImpressão do IRPF\"]}]",
"mensagens": [
{
"codigo": "[Sucesso-PROCURACOES]",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "[Aviso-PROCURACOES-20001]",
"texto": "Uma ou mais procurações foram retornadas com sucesso."
}
]
}
```
