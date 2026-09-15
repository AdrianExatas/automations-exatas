---
key: "DCTFWEB.GERARGUIA31"
family: "integra-dctfweb"
systemId: "DCTFWEB"
serviceId: "GERARGUIA31"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Gerar Documento de Arrecadação

Gerar Guia Declaração

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DCTFWEB.GERARGUIA31` |
| Família | `integra-dctfweb` |
| Caminho físico | `POST /Emitir` |
| Versão | Não informada |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00103) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | categoria | String ou Number | SIM | — | Categoria declaração |
| Dados de Entrada — Objeto Dados: | anoPA | String | SIM | — | Ano período apuração |
| Dados de Entrada — Objeto Dados: | mesPA | String | SIM. Exceto categoria 41 GERAL_13o_SALARIO ou 51 PF_13o_SALARIO | — | Mês período apuração |
| Dados de Entrada — Objeto Dados: | diaPA | String | NÃO. Somente para categoria 45 ESPETACULO_DESPORTIVO | — | Dia período apuração |
| Dados de Entrada — Objeto Dados: | cnoAfericao | Number | NÃO. Somente para categoria 44 AFERICAO | — | Número Obra |
| Dados de Entrada — Objeto Dados: | numeroReciboEntrega | Number | NÃO. Caso não informado a funcionalidade será executada para a declaração mais recente. | — | Número Recibo de entrega |
| Dados de Entrada — Objeto Dados: | numProcReclamatoria | String | NÃO. Somente para categoria 46 Reclamatória Trabalhista | — | Número Processo Reclamatória |
| Dados de Entrada — Objeto Dados: | DataAcolhimentoProposta | Number | NÃO | — | Inteiro (não string). Dia útil (no município associado ao contribuinte) do mês corrente maior ou igual ao dia de hoje, no formato aaaammdd, para pagamento da guia. Segue as mesmas regras do DCTF Web (opção "editar DARF") para proposição de data de acolhimento/pagamento. Veja como exemplo o objeto "dados" para a categoria RECLAMATORIA_TRABALHISTA abaixo. Ele assume que o mês corrente é julho de 2023, pagando uma guia atrasada e escolhendo a data de pagamento 31/07/2023 (último dia útil do mês). |
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
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}" 
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\"}"   
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
"dados": "{\"categoria\": \"RECLAMATORIA_TRABALHISTA\",\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\",\"DataAcolhimentoProposta\": 20230731}"
"dados": "{\"categoria\":46,\"anoPA\":\"2022\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"00365354520004013400\"}"   
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\",\"idsSistemaOrigem\":[8]}"
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\",\"idsSistemaOrigem\":[1,8]}"
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
    "idServico": "GERARGUIA31",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
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
    "idServico": "GERARGUIA31",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
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
    "idServico": "GERARGUIA31",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
  },
  "status": 200,
  "dados":  "{\"PDFByteArrayBase64\":\"<BASE64_REMOVIDO_TAMANHO_224836>\"}",
  "mensagens": [
    {
      "codigo": "Aviso-DCTFWEB-MG11",
      "texto": "Emissor Guia Pagamento executado com sucesso."
    },{
      "codigo": "Sucesso-DCTFWEB-MG00",
      "texto": "Requisição efetuada com sucesso"
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
    "idServico": "GERARGUIA31",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\",\"mesPA\":\"11\"}"
  },
  "status": 200,
  "dados": "{\"PDFByteArrayBase64\":\"<BASE64_REMOVIDO_TAMANHO_224836>\"}",
  "mensagens": [
    {
      "codigo": "Aviso-DCTFWEB-MG11",
      "texto": "Emissor Guia Pagamento executado com sucesso."
    },
    {
      "codigo": "Sucesso-DCTFWEB-MG00",
      "texto": "Requisição efetuada com sucesso"
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

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `e30c4757e0188f1622dbb0107788f106c11c447bbb8038a356bc06460c34d43e`
