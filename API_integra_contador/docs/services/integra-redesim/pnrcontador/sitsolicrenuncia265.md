---
key: "PNRCONTADOR.SITSOLICRENUNCIA265"
family: "integra-redesim"
systemId: "PNRCONTADOR"
serviceId: "SITSOLICRENUNCIA265"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Situação do Solicitar Renúncia

Consultar a situação da solicitação de renúncia.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PNRCONTADOR.SITSOLICRENUNCIA265` |
| Família | `integra-redesim` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | 2/12/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | idSolicitacao | Texto | SIM | — | ID da solicitação de renúncia |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Texto (3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Objetos Mensagem | — | — | Mensagem explicativa retornada no acionamento do serviço. É uma lista composta de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. |
| Dados de Saída | dados | Objeto sitSolicitacao | — | — | Situação da solicitação de renúncia |
| Dados de Saída | codigo | Texto | — | — | Código da mensagem retornada pelo serviço. |
| Dados de Saída | texto | Texto | — | — | Texto explicativo da mensagem. |
| Dados de Saída | resultado | Booleano | — | — | Indica se a solicitação já foi aprovada ou não |
| Dados de Saída | mensagemRetorno | Texto | — | — | Mensagem detalhando a situação da solicitação de renúncia |
| Dados de Saída | renuncia | Objeto Renúncia | — | — | Dados da renúncia, quando efetivada. Pode ser nulo quando a renúncia ainda não foi efetivada ou foi negada. |
| Dados de Saída | id | Número | — | — | Identificador único da renúncia. |
| Dados de Saída | cnpjRenunciada | Texto | — | — | CNPJ da empresa que foi renunciada. |
| Dados de Saída | dataRenuncia | Número (timestamp) | — | — | Data da renúncia em milissegundos (timestamp). |
| Dados de Saída | cnpjSolicitante | Texto | — | — | CNPJ do solicitante da renúncia (pode ser nulo). |
| Dados de Saída | cnpjRenunciante | Texto | — | — | CNPJ do renunciante (pode ser nulo). |
| Dados de Saída | cpfSolicitante | Texto | — | — | CPF do solicitante da renúncia (pode ser nulo). |
| Dados de Saída | cpfRenunciante | Texto | — | — | CPF do renunciante (pode ser nulo). |
| Dados de Saída | cpfLogado | Texto | — | — | CPF do usuário logado que realizou a requisição. |

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
        "numero": "00000000000100",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PNRCONTADOR",
        "idServico": "SITSOLICRENUNCIA265",
        "versaoSistema": "1.0",
        "dados": "{ \"idSolicitacao\"\"PNRCONTADOR-20250212-af81730aeb29c9fdac15\" }"
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
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PNRCONTADOR",
        "idServico": "SITSOLICRENUNCIA265",
        "versaoSistema": "1.0",
        "dados": "{ \"idSolicitacao\"\"PNRCONTADOR-20250212-af81730aeb29c9fdac15\" }"
    },
    "status": 200,
    "mensagens": [
        {
            "codigo": "Sucesso-PNRCONTADOR",
            "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"resultado\":true,\"mensagemRetorno\":\"Sua renúncia à empres99999999999999 foi efetuada com sucesso!\",\"renuncia\":{\"id\":123\"cnpjRenunciada\":\"99999999999999\",\"dataRenuncia\":\"1740682249338\\"cnpjSolicitante\":null,\"cnpjRenunciante\":nul\"cpfSolicitante\":\"00000000011\",\"cpfRenunciante\":\"00000000011\\"cpfLogado\":\"00000000011\"}}"
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

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/situacao_solicitar_renuncia/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_situacao_solicitar_renuncia/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/situacao_solicitar_renuncia/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_situacao_solicitar_renuncia/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `62dbbbe500e3c9cb0b47d2dcc45a541f5a66f1e03307939038a86db162d15f86`
