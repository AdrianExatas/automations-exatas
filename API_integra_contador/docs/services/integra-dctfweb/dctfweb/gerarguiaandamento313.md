---
key: "DCTFWEB.GERARGUIAANDAMENTO313"
family: "integra-dctfweb"
systemId: "DCTFWEB"
serviceId: "GERARGUIAANDAMENTO313"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Gerar Documento de Arrecadação para Declaração em Andamento

Gerar Documento de Arrecadação para Declaração em Andamento.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DCTFWEB.GERARGUIAANDAMENTO313` |
| Família | `integra-dctfweb` |
| Caminho físico | `POST /Emitir` |
| Versão | Não informada |
| Situação oficial | 28/03/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | categoria | String ou Number | SIM | — | Categoria declaração |
| Dados de Entrada — Objeto Dados: | anoPA | String | SIM | — | Ano período apuração |
| Dados de Entrada — Objeto Dados: | mesPA | String | SIM | — | Mês período apuração |
| Dados de Entrada — Objeto Dados: | diaPA | String | NÃO | — | Dia período apuração |
| Dados de Entrada — Objeto Dados: | cnoAfericao | Number | NÃO | — | CNO - Número Obra |
| Dados de Entrada — Objeto Dados: | numProcReclamatoria | String | NÃO | — | Número do Processo - Reclamatória Trabalhista |
| Dados de Entrada — Objeto Dados: | idsSistemaOrigem | Array | NÃO | — | Lista de sistema(s) de origem das receitas. Quando informado, a guia será gerada contendo apenas as receitas oriundas do(s) sistema(s) de origem especificado(s). |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String | — | — | Código HTTP retornado no acionamento do serviço. |
| Dados de Saída | dados | String ( String escapada: PDFByteArrayBase64) | — | — | Estrutura de dados de retorno. |
| Dados de Saída | mensagens | Array de Object | — | — | Mensagens retornadas no acionamento do serviço. É um array de objetos compostos de código e texto da mensagem. |
| Dados de Saída — Objeto dados: | PDFByteArrayBase64 | String | — | — | Documento DARF no formato PDF. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
"dados": "{\"categoria\":40,\"anoPA\":\"2025\",\"mesPA\":\"01\"}" 
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
"dados": "{\"categoria\": 50,\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
"dados": "{\"categoria\": \"ESPETACULO_DESPORTIVO\",\"anoPA\":\"2022\",\"mesPA\":\"05\",\"diaPA\":\"14\"}"
"dados": "{\"categoria\": 45,\"anoPA\":\"2022\",\"mesPA\":\"05\",\"diaPA\":\"14\"}"
"dados": "{\"categoria\": \"AFERICAO\",\"anoPA\":\"2022\",\"mesPA\":\"03\",\"cnoAfericao\": 28151}"
"dados": "{\"categoria\": 44,\"anoPA\":\"2022\",\"mesPA\":\"03\",\"cnoAfericao\": 28151}"
"dados": "{\"categoria\": \"GERAL_13o_SALARIO\",\"anoPA\":\"2022\"}"
"dados": "{\"categoria\": 41,\"anoPA\":\"2022\"}"   
"dados": "{\"categoria\": \"PF_13o_SALARIO\",\"anoPA\":\"2022\"}"
"dados": "{\"categoria\": 51,\"anoPA\":\"2022\"}"
"dados": "{\"categoria\": \"RECLAMATORIA_TRABALHISTA\",\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"
"dados": "{\"categoria\":46,\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\",\"idsSistemaOrigem\":[8]}"
"dados": "{\"categoria\":40,\"anoPA\":\"2025\",\"mesPA\":\"01\",\"idsSistemaOrigem\":[1,8]}"
```

### Exemplo 2 — request

Fonte oficial:

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
    "idSistema": "DCTFWEB",
    "idServico": "GERARGUIAANDAMENTO313",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
  }
}
```

Forma normalizada:

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
    "idSistema": "DCTFWEB",
    "idServico": "GERARGUIAANDAMENTO313",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
  }
}
```

### Exemplo 3 — response

Fonte oficial:

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
    "idSistema": "DCTFWEB",
    "idServico": "GERARGUIAANDAMENTO313",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
  },
  "status": 200,
  "responseId": "8f380ff8-6099-4565-b433-c7fd65b7e8c1",
  "responseDateTime": "2025-03-27T19:07:02.925Z",
  "dados": "{\"PDFByteArrayBase64\":\"<BASE64_REMOVIDO_TAMANHO_150436>\"}",
  "mensagens": [
    {
      "codigo": "[Sucesso-DCTFWEB]",
      "texto": "Requisição efetuada com sucesso."
    },
    {
      "codigo": "[Aviso-DCTFWEB-MG11]",
      "texto": "Emissor Guia Pagamento de DCTF em Andamento executado com sucesso."
    }
  ]
}
```

Forma normalizada:

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
    "idSistema": "DCTFWEB",
    "idServico": "GERARGUIAANDAMENTO313",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\",\"mesPA\":\"01\"}"
  },
  "status": 200,
  "responseId": "8f380ff8-6099-4565-b433-c7fd65b7e8c1",
  "responseDateTime": "2025-03-27T19:07:02.925Z",
  "dados": "{\"PDFByteArrayBase64\":\"<BASE64_REMOVIDO_TAMANHO_150436>\"}",
  "mensagens": [
    {
      "codigo": "[Sucesso-DCTFWEB]",
      "texto": "Requisição efetuada com sucesso."
    },
    {
      "codigo": "[Aviso-DCTFWEB-MG11]",
      "texto": "Emissor Guia Pagamento de DCTF em Andamento executado com sucesso."
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra DCTF](../../../generated/source/solucoes/integra-dctfweb/dctfweb/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-dctfweb/dctfweb/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia_andamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia_andamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `d272f507bacf7ea1e09808945e58955f4fff51ef4cde48b2c72ec960bbb68eb6`
