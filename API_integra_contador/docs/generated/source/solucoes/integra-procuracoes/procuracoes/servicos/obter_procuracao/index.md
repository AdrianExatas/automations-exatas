---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/servicos/obter_procuracao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "2db03f0d601ee239f4afed69b14cc5e670569fa070b23de7942e60dda84d4296"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/servicos/obter_procuracao/).

# Obter Procuração

Este serviço retorna as procurações eletrônicas entre um outorgante titular e seu respectivo procurador. Para cada procuração eletrônica encontrada, as seguintes informações são retornadas: quantidade de sistemas na procuração, nome do sistema e a data de expiração.

Obter Procuração

idSistema: PROCURACOES idServico: OBTERPROCURACAO41 versaoSistema: "1"

**Dados de Entrada**

Objeto "dados":

| Campo | Descrição | Tipo | Domínio | Obrigatório |
| --- | --- | --- | --- | --- |
| outorgante | Número identificador de pessoa física ou jurídica do outorgante. | String (11) - CPF / String (14) - CNPJ | – | SIM |
| tipoOutorgante | Identificador de pessoa física ou jurídica. | String (1) | 1 – CPF / 2 – CNPJ | SIM |
| outorgado | Número identificador de pessoa física ou jurídica do procurador. | String (11) - CPF / String (14) - CNPJ | – | SIM |
| tipoOutorgado | Identificador de pessoa física ou jurídica. | String (1) | 1 – CPF / 2 – CNPJ | SIM |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
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
"dados": "{ \"outorgante\":\"99999999999999\", \"tipoOutorgante\": \"2\"outorgado\":\"99999999999\", \"tipoOutorgado\":\"1\" }"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number (3) |
| mensagens | Mensagens explicativas retornadas no acionamento do serviço. | Array (Object Mensagem ) |
| dados | Estrutura de dados de retorno. | String (String escapada: Array : Object Procuracao ) |

Objeto Mensagem :

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código interno do negócio, de acordo com Lista de Mensagens de Negócio . | String |
| texto | Texto descritivo da mensagem. | String |

Objeto Procuracao :

| Campo | Descrição | Tipo |
| --- | --- | --- |
| dtexpiracao | Data de expiração. No formato aaaaMMdd (ano, mês e dia) | String (8) |
| nrsistemas | Quantidade de sistemas contidos na lista | Number |
| sistemas | Lista de sistemas contidos na procuração. | Array (String) |

**Exemplo: conteúdo payload json de saída**

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
"dados": "{ \"outorgante\":\"99999999999\", \"tipoOutorgante\": \"1\", \"outorgado\":\"99999999999999\", \"tipoOutorgado\":\"2\" }"
},
"status": 200,
"dados": "[{\"dtexpiracao\":\"20230414\", \"nrsistemas\":2,\"sistemas\":[\"Caixa Postal - Mensagens\",\"Caixa Postal - Termo de Opção pelo Domicílio Tributário Eletrônico\"]},{\"dtexpiracao\":\"20221231\", \"nrsistemas\":3,\"sistemas\":[\"Declarações - DIRPF\",\"Meu Imposto de Renda\",\"Opção de Impressão do IRPF\"]}]",
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
