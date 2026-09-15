---
key: "DCTFWEB.CONSXMLDECLARACAO38"
family: "integra-dctfweb"
systemId: "DCTFWEB"
serviceId: "CONSXMLDECLARACAO38"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar XML da declaração

Consultar o XML da declaração

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DCTFWEB.CONSXMLDECLARACAO38` |
| Família | `integra-dctfweb` |
| Caminho físico | `POST /Consultar` |
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
| Dados de Entrada — Objeto Dados: | numProcReclamatoria | String | NÃO. Somente para categoria 46 Reclamatória Trabalhista. | — | Número Processo Reclamatória |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | dados | String ( String escapada: XMLStringBase64) | — | — | Estrutura de dados de retorno. |
| Dados de Saída | mensagens | Array de Object | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um texto de tamanho 5 que representa um código interno do negócio. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"08\"}"
"dados": "{\"categoria\": 40,\"anoPA\":\"2022\",\"mesPA\":\"08\"}"
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
```

### Exemplo 2 — request

Fonte oficial:

```text
{
  "contratante": {
      "numero": "00000000000",
        "tipo": 1
  },        
  "autorPedidoDados": {
        "numero": "00000000000",
        "tipo": 1
  },
  "contribuinte": {
      "numero": "00000000000",
        "tipo": 1
  },    
  "pedidoDados": {
    "idSistema": "DCTFWEB",
    "idServico": "CONSXMLDECLARACAO38",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
  }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "00000000000",
    "tipo": 1
  },
  "autorPedidoDados": {
    "numero": "00000000000",
    "tipo": 1
  },
  "contribuinte": {
    "numero": "00000000000",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "DCTFWEB",
    "idServico": "CONSXMLDECLARACAO38",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
  }
}
```

### Exemplo 3 — response

Fonte oficial:

```text
{
  "contratante": {
    "numero": "00000000000",
    "tipo": 1
  },
  "autorPedidoDados": {
    "numero": "00000000000",
    "tipo": 1
  },
  "contribuinte": {
    "numero": "00000000000",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "DCTFWEB",
    "idServico": "CONSXMLDECLARACAO38",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
  },
  "status": 200,

  "dados": "{\"XMLStringBase64\":\"<BASE64_REMOVIDO_TAMANHO_20236>\"}",
  "mensagens": [
      {
      "codigo": "Aviso-DCTFWEB-MG11",
      "texto": "Gerador Minuta XML Declaração executado com sucesso."
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
    "numero": "00000000000",
    "tipo": 1
  },
  "autorPedidoDados": {
    "numero": "00000000000",
    "tipo": 1
  },
  "contribuinte": {
    "numero": "00000000000",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "DCTFWEB",
    "idServico": "CONSXMLDECLARACAO38",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"}"
  },
  "status": 200,
  "dados": "{\"XMLStringBase64\":\"<BASE64_REMOVIDO_TAMANHO_20236>\"}",
  "mensagens": [
    {
      "codigo": "Aviso-DCTFWEB-MG11",
      "texto": "Gerador Minuta XML Declaração executado com sucesso."
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

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_xml_declaracao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_xml_declaracao/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `98dbc3e1b529d9a0b409a42bf9a31ee143285bbcba1bf257a5311cdfea7552e7`
