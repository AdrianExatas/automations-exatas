---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6dde824a4cd117d69b02bdedb96fabc8a38f863362c73f149a1920fa9e206bab"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/mensagens/).

# Mensagens de negócio

## Mensagens Obter indicador DTE

| Códigos | Mensagem |
| --- | --- |
| Sucesso-DTE-00 | Requisição CPF efetuada com sucesso. |
| Sucesso-DTE-01 | Requisição CNPJ efetuada com sucesso. |
| Erro-DTE-04 | CPF(9 digitos) inválido. |
| Erro-DTE-05 | CNPJ(8 digitos) inválido |

## Mensagens de Exceção

| Códigos | Mensagem |
| --- | --- |
| Erro-DTE-991 | Serviço informado não é um dos serviços disponibilizados pelo sistema. |
| Erro-DTE-992 | Serviço informado ({0}) inválido. |
| Erro-DTE-993 | Não foi possível converter retorno do serviço acionado do DTE. |
| Erro-DTE-994 | Campo informado ({0}) inválido. |
| Erro-DTE-995 | Erro ao conectar com o serviço DTE. |
