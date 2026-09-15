# Envelope e chamadas de negócio

Fonte normativa: [estrutura do Integra Contador](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/integra_contador/).

## Endereço e caminhos físicos

Base de produção:

```text
https://gateway.apiserpro.serpro.gov.br/integra-contador/v1
```

Todo serviço lógico usa `POST` em um dos caminhos:

| Caminho | Uso |
| --- | --- |
| `/Apoiar` | Serviço auxiliar ou de suporte |
| `/Consultar` | Consulta de dados |
| `/Declarar` | Entrega ou transmissão de declaração |
| `/Emitir` | Emissão de guia, relatório, comprovante ou arrecadação |
| `/Monitorar` | Solicitação ou obtenção de eventos |

Use `operationPath` do `catalog/services.json`; não escolha o caminho apenas pelo nome da função.

## Cabeçalhos

```http
Accept: application/json
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
jwt_token: <JWT_TOKEN>
X-Request-Tag: <IDENTIFICADOR_OPCIONAL>
autenticar_procurador_token: <TOKEN_OPCIONAL>
```

## Envelope comum

```json
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
    "idServico": "GERARDAS12",
    "versaoSistema": "1.0",
    "dados": "{\"periodoApuracao\":\"202601\"}"
  }
}
```

`pedidoDados.dados` é uma string contendo JSON. Em TypeScript, monte o objeto interno e use exatamente um `JSON.stringify`:

```ts
const dados = JSON.stringify({ periodoApuracao: "202601" });
```

Não envie `dados` como objeto e não serialize a string uma segunda vez.

## Identificações

- `contratante`: CNPJ de 14 dígitos que contratou o produto, sempre `tipo: 2`.
- `autorPedidoDados`: CPF (`tipo: 1`) ou CNPJ (`tipo: 2`) que realiza o pedido.
- `contribuinte`: CPF/CNPJ objeto da operação. Alguns serviços em lote usam tipos 3 ou 4; siga o contrato específico.
- Todos os números são enviados apenas com dígitos, sem máscara.

## Resposta comum

O envelope costuma ser repetido e acrescido de:

```json
{
  "status": 200,
  "dados": "{\"resultado\":\"valor\"}",
  "mensagens": [
    { "codigo": "00000", "texto": "Mensagem do serviço" }
  ]
}
```

O campo de resposta `dados` também costuma ser JSON escapado. Faça o parse do envelope e depois um segundo `JSON.parse(response.dados)`. Alguns serviços retornam Base64 nesse objeto interno.
