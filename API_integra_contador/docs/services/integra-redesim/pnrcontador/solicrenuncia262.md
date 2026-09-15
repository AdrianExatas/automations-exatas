---
key: "PNRCONTADOR.SOLICRENUNCIA262"
family: "integra-redesim"
systemId: "PNRCONTADOR"
serviceId: "SOLICRENUNCIA262"
version: null
operationPath: "Declarar"
sourceStatus: "fetched"
---

# Solicitar Renúncia

Solicitar Renúncia de Vínculo.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PNRCONTADOR.SOLICRENUNCIA262` |
| Família | `integra-redesim` |
| Caminho físico | `POST /Declarar` |
| Versão | Não informada |
| Situação oficial | 2/12/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | solicitacaoRenunciaContador | Objeto SolicitacaoRenuncia | SIM | — | Solicitação de renúncia |
| Dados de Entrada — Objeto Dados: | cienciaDeclaracoes | boolean | SIM | — | Este campo deve ser enviado com a confirmação do aceite do Autor do Pedido de Dados para as Declarações exigidas para a renúncia. |
| Dados de Entrada — Objeto Dados: | cnpj | Texto (14) | SIM | — | CNPJ da empresa com a qual deseja renunciar vínculo. Número do CNPJ completo (incluindo o DV). Só são aceitos números e sem a máscara de formatação. |
| Dados de Entrada — Objeto Dados: | cpfContador | Texto (11) | NÃO | — | CPF do profissional contábil renunciante, incluindo o DV, sem a máscara de formatação. |
| Dados de Entrada — Objeto Dados: | cnpjEmpresaContabil | Texto (14) | NÃO | — | CNPJ da empresa contábil renunciante, incluindo o DV, sem a máscara de formatação. |
| Dados de Entrada — Objeto Dados: | cpfPreenchedor | Texto (11) | SIM | — | CPF do preenchedor da solicitação incluindo o DV, sem a máscara de formatação. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Texto (3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Objetos Mensagem | — | — | Mensagem explicativa retornada no acionamento do serviço. É uma lista composta de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. |
| Dados de Saída | dados | Objeto idSolicitacao | — | — | ID da solicitação da renúncia. |
| Dados de Saída | codigo | Texto | — | — | Código da mensagem retornada pelo serviço. |
| Dados de Saída | texto | Texto | — | — | Texto explicativo da mensagem. |
| Dados de Saída | idSolicitacao | Texto | — | — | ID da solicitação de renúncia |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
    "contratante": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000011",
        "tipo": 1
    },
    "pedidoDados": {
        "idSistema": "PNRCONTADOR",
        "idServico": "SOLICRENUNCIA262",
        "versaoSistema": "1.0",
        "dados": "{ \"solicitacaoRenunciaContador\": { \"cnpj\"\"99999999999999\", \"cpfContador\": \"00000000011\"\"cnpjEmpresaContabil\": \"00000000000100\", \"cpfPreenchedor\"\"00000000011\" }, \"cienciaDeclaracoes\": false }"
    }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
    "contratante": {
       "numero": "00000000000100",
       "tipo": 2
   },
   "autorPedidoDados": {
       "numero": "00000000000100",
       "tipo": 2,
       "cpfResponsavel": "00000000011"
   },
   "contribuinte": {
       "numero": "00000000011",
       "tipo": 1
   },
   "pedidoDados": {
       "idSistema": "PNRCONTADOR",
       "idServico": "SOLICRENUNCIA262",
       "versaoSistema": "1.0",
       "dados": "{ \"solicitacaoRenunciaContador\": { \"cnpj\": \"99999999999999\", \"cpfContador\": \"00000000011\", \"cnpjEmpresaContabil\": \"00000000000100\", \"cpfPreenchedor\": \"00000000011\" }, \"cienciaDeclaracoes\": true }"
   },
    "status": 200,
   "mensagens": [
       {
           "codigo": "[Sucesso-PNRCONTADOR]",
           "texto": "Requisição efetuada com sucesso."
       },
       {
           "codigo": "[Aviso-PNRCONTADOR-304]",
           "texto": "Utilize o serviço 'Situação Solicitar Renúncia' para consultar a situação da solicitação. É recomendado um intervalo de pelo menos 30 segundos entre essas requisições, para garantir que a renúncia já tenha sido processada."
       }
   ],
    "dados": "{\"idSolicitacao\": \"PNRCONTADOR-20250212-af81730aeb29c9fdac15\"}"
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "00000000000100",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "00000000000100",
    "tipo": 2,
    "cpfResponsavel": "00000000011"
  },
  "contribuinte": {
    "numero": "00000000011",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "PNRCONTADOR",
    "idServico": "SOLICRENUNCIA262",
    "versaoSistema": "1.0",
    "dados": "{ \"solicitacaoRenunciaContador\": { \"cnpj\": \"99999999999999\", \"cpfContador\": \"00000000011\", \"cnpjEmpresaContabil\": \"00000000000100\", \"cpfPreenchedor\": \"00000000011\" }, \"cienciaDeclaracoes\": true }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PNRCONTADOR]",
      "texto": "Requisição efetuada com sucesso."
    },
    {
      "codigo": "[Aviso-PNRCONTADOR-304]",
      "texto": "Utilize o serviço 'Situação Solicitar Renúncia' para consultar a situação da solicitação. É recomendado um intervalo de pelo menos 30 segundos entre essas requisições, para garantir que a renúncia já tenha sido processada."
    }
  ],
  "dados": "{\"idSolicitacao\": \"PNRCONTADOR-20250212-af81730aeb29c9fdac15\"}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-redesim/pnrcontador/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-redesim/pnrcontador/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/solicitar_renuncia/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/solicitar_renuncia/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_solicitar_renuncia/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `4c4baed576ae33c26ed44145f0fc7d97eeed9f73be96048f0d865de2f7643397`
