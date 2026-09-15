---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/obter_eventos_pj/"
sourceUpdatedAt: "17 de junho de 2026 18:10:56 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "deb9bf6ab91fc31d47304f8e34bf28ea2c4727b4f3d028fa5a8b67cbdb8e4da7"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/obter_eventos_pj/).

# Consultar Eventos PJ

Essa consulta deve ser acionada com o protocolo e logo após o tempo de espera da solicitação de eventos concluir. A consulta permite obter os últimos eventos de atualização de Pessoa Jurídica (PJ). Os eventos estão pré-definidos no [Mapa dos Eventos de Atualização](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mapa_dos_eventos/).

Identificação no Pedido de Dados

idSistema: EVENTOSATUALIZACAO idServico: OBTEREVENTOSPJ134 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| protocolo | Identificador exclusivo obtido da solicitação de eventos. | String (36 bytes) | SIM |
| evento | valor de identificação do evento | String | SIM |

O campo "numero" do objeto Contribuinte deve estar vazio. O "tipo" é igual a 4.

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
"numero": "",
"tipo": 4
},
"pedidoDados": {
"idSistema": "EVENTOSATUALIZACAO",
"idServico": "OBTEREVENTOSPJ134",
"versaoSistema": "1.0",
"dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\",\"evento\":\"E0301\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno. | String escapada Object : Matriz de Eventos |

Objeto: Matriz de Eventos

| Campo | Descrição | Tipo |
| --- | --- | --- |
| elementos | cada linha é representado por duas colunas com valores com o NI do contribuinte e a data do evento de atualização (formato AAMMDD). Quando um contribuinte não recebeu nenhuma atualização o resultado é uma string vazia. Quando não tem procuração outorgada é apresentado um caractere xis "x", onde o acesso foi negado e não houve consulta ao evento desse Contribuinte. | Array de Arrays, onde cada linha pode conter no máx 1.000 linhas |

Como exemplo, temos uma matriz com um pedido de dados para 4 CNPJs. O programa vai responder com uma representação dessa matriz em JSON. Essa matriz de 4 x 2 em JSON utiliza o tipo array de arrays. Cada array interno representará uma linha da matriz. Aqui está um exemplo de como seria a representação dessa matriz:

```text
[
["00000000000000",""],
["11111111111111","230417"],
["22222222222222","230428"],
["33333333333333","x"]
]
```

Nesse exemplo, a matriz contém 4 linhas e cada linha possui dois elementos.

Lembrando que, em uma matriz 4x2, cada linha possui dois elementos. Portanto, existiram 4 pares de elementos na matriz.

A quarta linha "33333333333333" com o segundo elemento "x" representa que o acesso foi negado para esse Contribuinte, a possível causa seja inexistência de procuração eletrônica no momento da consulta.

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno obter eventos PJ](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_obter_eventos_pj/)
