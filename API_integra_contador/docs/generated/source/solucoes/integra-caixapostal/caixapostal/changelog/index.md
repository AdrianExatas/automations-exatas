---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/changelog/"
sourceUpdatedAt: "31 de agosto de 2026 11:10:58 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cc8abb67e1e6caacf1a458c1563def594b88a8a1ef420cd7d2a5c0bbd468b840"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/changelog/).

# Changelog

## [Unreleased] - 2026-09-05

### Changed

- O serviço Obter Lista de Mensagens por Contribuinte ( MSGCONTRIBUINTE61 ) foi alterado para adequação ao serviço interno da Caixa Postal.
- No grupo de Dados de Entrada , o campo indicadorPagina , anteriormente definido como Number(14) , terá seu tamanho ampliado em 10 dígitos, passando a ser definido como Number(24) .
- Da mesma forma, no grupo de Dados de Saída , o campo ponteiroPaginaRetornada , anteriormente definido como Number(14) , também terá seu tamanho ampliado em 10 dígitos, passando a ser definido como Number(24) .

## [1.0.2] - 2025-05-016

### Added

- O serviço Obter Lista de Mensagens por Contribuintes (MSGCONTRIBUINTE61) foi modificado para adicionar o parâmetro de consulta "indicadorFavorito". Agora é possível filtrar as mensagens conforme o indicador de mensagem favorita ou não (0 – Não favorita 1 –Favorita). O retorno do serviço MSGCONTRIBUINTE61 também apresenta o valor "indicadorFavorito" de cada mensagem retornada.

## [1.0.1] - 2023-01-16

### Changed

- O serviço Obter Indicador de Novas Mensagens (INNOVAMSG63) foi modificado do tipo Consultar para Monitorar.

## [1.0.0] - 2022-09-23

### Added

- versão inicial de lançamento.
