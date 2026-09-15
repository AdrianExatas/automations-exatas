---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/solicitar_eventos_pf/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "a58e2cb3622092be46bc04d07c639fec191a9ecbba5dda10fc0ae860ec7a2ebb"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/solicitar_eventos_pf/).

# Consultar Eventos PF

Permite solicitar os últimos eventos de atualização de Pessoa Física de acordo com os eventos pré-definidos no [Mapa dos Eventos de Atualização](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mapa_dos_eventos/).

Identificação no Pedido de Dados

idSistema: EVENTOSATUALIZACAO idServico: SOLICEVENTOSPF131 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| evento | valor de identificação do evento | String | SIM |

O lote com a lista de números de inscrição deve ser informado no campo "numero" com o "tipo" 3 do objeto "contribuinte". No caso de PF deve ser informado o número CPF. Essa lista suporta no mínimo 1 e no máximo 1000 NIs (tamanho 11 e separado por vírgula).

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
"numero": "00000000000,11111111111,22222222222,33333333333",
"tipo": 3
},
"pedidoDados": {
"idSistema": "EVENTOSATUALIZACAO",
"idServico": "SOLICEVENTOSPF131",
"versaoSistema": "1.0",
"dados": "{\"evento\": \"E0301\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno. | String escapada Object : Matriz de Eventos |

Objeto: Protocolo

| Campo | Descrição | Tipo |
| --- | --- | --- |
| protocolo | Identificador exclusivo da solicitação de eventos. | String (36 bytes) |
| TempoEsperaMedioEmMs | Tempo médio de espera em milissegundos (ms). Aguarde esse tempo para que seja finalizado o processamento da solicitação do lote. Após esse tempo de espera é possível obter os eventos. Esse tempo é calculado utilizado um média móvel dos processamentos, caso a obtenção seja invocada antes, pode ocorrer de não ter finalizado o processamento do lote. | Number |
| TempoLimiteEmMin | Tempo Limite em minutos (min). Esse tempo indica o tempo máximo que a solicitação do protocolo ficará disponível para obtenção. | Number |

Como exemplo, temos o seguinte json com a estrutura dos dados de resposta:

```text
{
"protocolo": "a65f3455-fa91-419b-b0ad-c4ac50695abf",
"TempoEsperaMedioEmMs": 277,
"TempoLimiteEmMin": 5
}
```

Neste exemplo específico, ao utilizar o número de protocolo fornecido e aguardar por um período de 277 milissegundos, é viável obter os eventos solicitados em um prazo máximo de 5 minutos.

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno solicitar eventos PF](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_solicitar_eventos_pf/)
