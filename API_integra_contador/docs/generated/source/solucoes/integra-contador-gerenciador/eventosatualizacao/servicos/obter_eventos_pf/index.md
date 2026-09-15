---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/obter_eventos_pf/"
sourceUpdatedAt: "17 de junho de 2026 18:10:56 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "69854df5b8645709f59f64ecb671cb17451b723ed7cf8e0472b2dc8047550ae6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/obter_eventos_pf/).

# Consultar Eventos PF

Essa consulta deve ser acionada com o protocolo e logo após o tempo de espera da solicitação de eventos concluir. A consulta permite obter os últimos eventos de atualização de Pessoa Física (PF). Os eventos estão pré-definidos no [Mapa dos Eventos de Atualização](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mapa_dos_eventos/).

Identificação no Pedido de Dados

idSistema: EVENTOSATUALIZACAO idServico: OBTEREVENTOSPF133 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| protocolo | Identificador exclusivo obtido da solicitação de eventos. | String (36 bytes) | SIM |
| evento | valor de identificação do evento | String | SIM |

O campo "numero" do objeto Contribuinte deve estar vazio. O "tipo" é igual a 3.

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
"tipo": 3
},
"pedidoDados": {
"idSistema": "EVENTOSATUALIZACAO",
"idServico": "OBTEREVENTOSPF133",
"versaoSistema": "1.0",
"dados": "{\"protocolo\":\"a65f3455-fa91-419b-b0ad-c4ac50695abf\",\"evento\":\"E0301\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno. | String escapada Object : Matriz de Eventos |

Object: Matriz de Eventos

| Campo | Descrição | Tipo |
| --- | --- | --- |
| elementos | cada linha é representado por duas colunas com valores com o NI do contribuinte e a data do evento de atualização (formato AAMMDD). Quando um contribuinte não recebeu nenhuma atualização o resultado é uma string vazia. Quando não tem procuração outorgada é apresentado um caractere xis "x", onde o acesso foi negado e não houve consulta ao evento desse Contribuinte. | Array de Arrays, onde cada linha pode conter no máx 1.000 linhas |

Como exemplo, temos uma matriz com um pedido de dados para 4 CPFs. O programa vai responder com uma representação dessa matriz em JSON. Essa matriz de 4 x 2 em JSON utiliza o tipo array de arrays. Cada array interno representará uma linha da matriz. Aqui está um exemplo de como é a representação dessa matriz:

```text
[
["00000000000",""],
["11111111111","230407"],
["22222222222","230408"],
["33333333333","x"]
]
```

Nesse exemplo, a matriz contém 4 linhas e cada linha possui dois elementos.

Lembrando que, em uma matriz 4x2, cada linha possui dois elementos. Portanto, existiram 4 pares de elementos na matriz.

A quarta linha "33333333333" com o segundo elemento "x" representa que o acesso foi negado para esse Contribuinte, a possível causa seja inexistência de procuração eletrônica no momento da consulta.

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno obter eventos PF](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_obter_eventos_pf/)
