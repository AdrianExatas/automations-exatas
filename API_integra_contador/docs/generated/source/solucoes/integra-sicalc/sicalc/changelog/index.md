---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/changelog/"
sourceUpdatedAt: "23 de junho de 2026 19:14:31 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "c29ec077d596ed0875f2e38e16340f745a08f76c676b243c1534d9ec8590a16c"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/changelog/).

# Changelog

## [1.0.0] - 2022-09-23

### Added

Versão inicial de lançamento.

## [1.0.1] - 2022-10-18

### Changed

Em Serviços / Consolidar e Emitir um DARF:

- Nome do atributo codigoExtensao atualizado para codigoReceitaExtensao
- Nome do atributo dataVencimentoImposto atualizado para vencimento

## [1.0.2] - 2023-02-09

### Added

Em Serviços / Consolidar e Emitir um DARF:

- Inclusão do atributo confissao (ref a MP 1.160/2023, campo opcional, boolean)
- Inclusão de caixa de mensagem avisando sobre o uso do atributo confissão
- Inclusão de exemplo usando o atributo confissao

Em Serviços / Consultar Código Receita Sicalc:

- Inclusão do atributo confissao (ref a MP 1.160/2023, campo opcional, boolean)

## [1.0.3] - 2023-03-30

### Changed

Em Dados de Domínio:

- Correção do código do atributo tipoPA
- Remoção do atributo moeda
- Inclusão do formato do atributo dataPA em relação ao atributo tipoPA
- Inclusão sobre o código do município

Em Serviços / Consolidar e Emitir um DARF:

- Remoção do atributo moeda
- Correção da ordem dos atributos de saída

## [1.0.4] - 2023-05-05

### Removed

Motivo: fim da vigência da medida provisória Em Serviços / Consolidar e Emitir um DARF:

- Exclusão do atributo confissao (ref a MP 1.160/2023, campo opcional, boolean)
- Exclusão da caixa de mensagem avisando sobre o uso do atributo confissão
- Exclusão do exemplo usando o atributo confissao

Em Serviços / Consultar Código Receita Sicalc:

- Exclusão do atributo confissao (ref a MP 1.160/2023, campo opcional, boolean)

Em Exemplos:

- Exclusão do arquivo retorno_apoio_consulta_receitas_do_sicalc_confissao

## [1.0.5] - 2023-07-04

### Changed

Em Serviços / Consolidar e Emitir um DARF:

- Nova coluna - observação (para ajudar aos usuários sobre alguns atributos de entrada)

Em Dados de Apoio:

- Inclusão e ajuste dos links para os serviços de consulta da Tabela de Órgãos e Municipios e da Tabela de Receitas

## [1.0.6] - 2023-10-05

### Changed

Em Serviços / Consolidar e Emitir um DARF:

- Campo número de referência - link para o item Dados de Domínio

Em Dados de Domínio:

- Inclusão da informação sobre o campo referência e valores para receita 1070 (ITR)

Em Glossário:

- Inclusão dos termos NIRF e CIB

## [1.0.7] - 2024-11-18

### Changed

Em Dados de Domínio:

- Atualização das informações sobre o código de município

Em Glossário:

- Inclusão do termo RFB

Em Mensagens de negócio:

- Atualização das mensagens devolvidas

## [1.0.8] - 2024-12-16

### Changed

Em Serviços / Consolidar e Emitir um DARF:

- Inclusão do número do documento nos dados de retorno

Em Serviços / Consolidar e Emitir o Código de Barras do DARF calculado

- Inclusão do número do documento nos dados de retorno

## [1.0.9] - 2026-01-08

### Changed

Em Serviços / Consolidar e Emitir um DARF:

- Atualização de informação de parâmetros

Em Serviços / Consolidar e Emitir o Código de Barras do DARF calculado

- Atualização de informação de parâmetros

## [1.1.0] - 2026-02-10

### Changed

Em Serviços / Consolidar um DARF:

- Inclusão do serviço CONSOLIDAR54

## [1.1.1] - 2026-06-03

### Changed

Inclusão de exemplo de CNPJ alfanumérico
