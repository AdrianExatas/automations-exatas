---
key: "SITFIS.RELATORIOSITFIS92"
family: "integra-sitfis"
systemId: "SITFIS"
serviceId: "RELATORIOSITFIS92"
version: "2.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir Relatório de Situação Fiscal

Emissão de Relatório de Situação Fiscal

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `SITFIS.RELATORIOSITFIS92` |
| Família | `integra-sitfis` |
| Caminho físico | `POST /Emitir` |
| Versão | `2.0` |
| Situação oficial | 01/09/2023 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00002) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | protocoloRelatorio | Texto | SIM | — | Protocolo retornado no serviço apoiar , que deve ser utilizado para recuperar o relatório de situação fiscal. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída | pdf | Texto (base64) | — | — | Documento PDF do relatório de situação fiscal. Este campo é retornado quando o status é 200. |
| Dados de Saída | tempoEspera | Inteiro | — | — | Tempo de espera estimado para acionar o serviço para obter o relatório. Este campo é retornado quando o status é 202. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

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
    "numero": "99999999999",
    "tipo": 1
  },         
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "RELATORIOSITFIS92",
    "versaoSistema": "2.0",
    "dados": "{ \"protocoloRelatorio\":\"+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/u+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfop+bxvYJZsVym270eO8oZTDIr3OJj==\" }"
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
    "numero": "99999999999",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "RELATORIOSITFIS92",
    "versaoSistema": "2.0",
    "dados": "{ \"protocoloRelatorio\":\"+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/u+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfop+bxvYJZsVym270eO8oZTDIr3OJj==\" }"
  }
}
```

### Exemplo 2 — response

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
   "numero": "99999999999",
   "tipo": 1
  },
  "pedidoDados": {
   "idSistema": "SITFIS",
   "idServico": "RELATORIOSITFIS92",
   "versaoSistema": "2.0",
   "dados": "{ \"protocoloRelatorio\"+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/u+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfv3+bxvYJZsVym270eO8oZTDIr3OJj==\" }"
  },
  "status": 200,
  "dados": "[{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_107008>\"}]",
  "mensagens":
   [
    {
    "codigo": "[Sucesso-Sitfis-SC01]",
    "texto": "A requisição foi efetuada com sucesso."
    }
   ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Sitfis](../../../generated/source/solucoes/integra-sitfis/sitfis/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_emitir_relatorio/))
- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_emitir_relatorio/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/servicos/emitir_relatorio/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_emitir_relatorio/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `b350ebd777ab63cff9c5161f4a912e720fd47b642f3f9977d40baa327fce45fc`
