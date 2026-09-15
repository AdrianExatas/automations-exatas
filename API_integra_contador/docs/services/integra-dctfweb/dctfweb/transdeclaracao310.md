---
key: "DCTFWEB.TRANSDECLARACAO310"
family: "integra-dctfweb"
systemId: "DCTFWEB"
serviceId: "TRANSDECLARACAO310"
version: null
operationPath: "Declarar"
sourceStatus: "fetched"
---

# Transmitir declaração

Transmitir Declaração

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DCTFWEB.TRANSDECLARACAO310` |
| Família | `integra-dctfweb` |
| Caminho físico | `POST /Declarar` |
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
| Dados de Entrada — Objeto Dados: | numProcReclamatoria | String | NÃO. Somente para categoria 46 Reclamatória Trabalhista | — | Número Processo Reclamatória |
| Dados de Entrada — Objeto Dados: | xmlAssinadoBase64 | String | SIM | — | O XML obtido pela operação 'Consultar o XML da Declaração' assinado e em base64. O certificado usado na assinatura deve ser o do autor do pedido de dados. O elemento do XML a ser assinado é o 'ConteudoDeclaracao' (se não for o caso, a transmissão será rejeitada). Além disso, a assinatura deve seguir o padrão indicado na seção Padrões exigidos para a assinatura digital dessa página. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | dados | String ( String escapada: NumeroRecibo) | — | — | Estrutura de dados de retorno. |
| Dados de Saída | mensagens | Array de Object | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um texto de tamanho 5 que representa um código interno do negócio. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"04\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"  
"dados": "{\"categoria\": 40,\"anoPA\":\"2022\",\"mesPA\":\"04\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 50,\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"ESPETACULO_DESPORTIVO\",\"anoPA\":\"2022\",\"mesPA\":\"04\",\"diaPA\":\"19\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 45,\"anoPA\":\"2022\",\"mesPA\":\"04\",\"diaPA\":\"19\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"GERAL_13o_SALARIO\",\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
 "dados": "{\"categoria\": 41,\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"PF_13o_SALARIO\",\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 51,\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\":  \"RECLAMATORIA_TRABALHISTA\",\"anoPA\":\"2023\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"123456789012345\",\"xmlAssinadoBase64\": \"AQUI_VAI_TEXTOBASE64ASSINADO\"}"   
"dados": "{\"categoria\": 46,\"anoPA\":\"2023\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"123456789012345\",\"xmlAssinadoBase64\": \"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
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
       "idServico": "TRANSDECLARACAO310",
       "versaoSistema": "1.0",
       "dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\\"mesPA\":\"06\",\"xmlAssinadoBase64\"\"<BASE64_REMOVIDO_TAMANHO_24093>\"}"
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
        "idServico": "TRANSDECLARACAO310",
        "versaoSistema": "1.0",
        "dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\": \"<BASE64_REMOVIDO_TAMANHO_24892>\"}"
    },
    "status": 200,
    "dados": "{\"NumeroRecibo\":24781}",
    "mensagens": [
        {
            "codigo": "Aviso-DCTFWEB-MG11",
            "texto": "Transmissor Declaração Assinada executado com sucesso."
        },
        {
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
    "idServico": "TRANSDECLARACAO310",
    "versaoSistema": "1.0",
    "dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\": \"<BASE64_REMOVIDO_TAMANHO_24892>\"}"
  },
  "status": 200,
  "dados": "{\"NumeroRecibo\":24781}",
  "mensagens": [
    {
      "codigo": "Aviso-DCTFWEB-MG11",
      "texto": "Transmissor Declaração Assinada executado com sucesso."
    },
    {
      "codigo": "Sucesso-DCTFWEB-MG00",
      "texto": "Requisição efetuada com sucesso"
    }
  ]
}
```

### Exemplo 4 — other

Fonte oficial:

```text
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001REC-xml-c14n-20010315"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#id_12345">
            <ds:Transforms>
                <ds:Transform Algorithm="http://www.w3.org/2000/09xmldsig#enveloped-signature"/>
                <ds:Transform Algorithm="http://www.w3.org/TR/2001REC-xml-c14n-20010315"/>
            </ds:Transforms>
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <ds:DigestValue>Jb3obb+h9SIKg5JEDzSLzFYVYeQSG+2rc/auTZ7aUPU=<ds:DigestValue>
        </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>...</ds:SignatureValue>
    <ds:KeyInfo>
        <ds:X509Data>
            <ds:X509Certificate>...</ds:X509Certificate>
        </ds:X509Data>
    </ds:KeyInfo>
</ds:Signature>
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra DCTF](../../../generated/source/solucoes/integra-dctfweb/dctfweb/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-dctfweb/dctfweb/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `39b879907b9ac62fb7f6f266f251d44bcebece2a3342ba1f039e2c779595c1b9`
