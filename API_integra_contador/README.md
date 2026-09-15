# API Integra Contador — base de conhecimento para IA

Documentação local, versionada e rastreável da API Integra Contador. A base transforma a documentação pública do SERPRO em guias curados, páginas Markdown por contrato e um catálogo legível por máquinas.

O SERPRO continua sendo a fonte normativa. Cada artefato gerado informa URL, data declarada pela fonte, data de coleta e hash semântico.

## Acesso rápido

- [Resumo de uma página para a liderança](docs/guides/resumo-executivo.md)
- [Visão executiva e oportunidades para a liderança](docs/guides/visao-executiva.md)
- [Índice completo de serviços](docs/SERVICE_INDEX.md)
- [Autenticação mTLS e OAuth2](docs/guides/autenticacao.md)
- [Envelope e chamadas](docs/guides/envelope-e-chamadas.md)
- [Procurações](docs/guides/procuracoes.md)
- [Erros, timeout e retentativas](docs/guides/erros-e-retentativas.md)
- [Rastreabilidade](docs/guides/rastreabilidade.md)
- [Ambiente de demonstração](docs/guides/demonstracao.md)
- [Arquivos Base64](docs/guides/arquivos-base64.md)
- [Catálogo JSON](catalog/services.json) e [JSON Schema](catalog/service-record.schema.json)
- [OpenAPI oficial](openapi/official.yaml)
- [Manifesto de fontes](sources/manifest.json)

Para agentes que reconhecem o padrão `llms.txt`, o ponto de entrada é [llms.txt](llms.txt). As regras locais de operação estão em [AGENTS.md](AGENTS.md).

## Estrutura

```text
docs/guides/              conteúdo transversal revisado
docs/services/            contratos consolidados por família e sistema
docs/generated/source/    snapshot Markdown normalizado de cada página oficial
catalog/                  ServiceRecord em JSON, NDJSON e seu JSON Schema
sources/manifest.json     proveniência, hashes e estado das coletas
openapi/official.yaml     OpenAPI publicado pelo SERPRO, sem enriquecimento fictício
examples/typescript/      exemplos reutilizáveis, não um SDK
scripts/                  sincronização e validação
```

## Comandos

Requer Bun 1.3.11 ou superior.

```powershell
bun run sync
bun run sync:check
bun run validate
bun test
```

- `sync` descobre a navegação atual, coleta páginas oficiais, consolida contratos e atualiza os artefatos.
- `sync:check` consulta as fontes sem escrever e retorna código diferente de zero se houver mudanças, falhas ou páginas novas/removidas.
- `validate` verifica cobertura, proveniência, estrutura, OpenAPI, exemplos e possível vazamento de segredos.
- `test` usa somente fixtures e transporte HTTP simulado.

## Política de atualização

Conteúdo em `docs/generated`, `docs/services`, `catalog`, `sources/manifest.json`, `docs/SERVICE_INDEX.md`, `llms.txt` e `openapi/official.yaml` é gerado. Não o edite manualmente. Ajustes editoriais e regras operacionais pertencem a `docs/guides`.

Falhas temporárias do portal não apagam snapshots válidos. A fonte é marcada como `stale`; páginas nunca coletadas são marcadas como `missing`. Inconsistências oficiais são registradas em `issues[]`, sem correção silenciosa.

## Segurança

- Não salve certificados, senhas, Consumer Key, Consumer Secret ou tokens neste diretório.
- Use somente placeholders em exemplos e variáveis de ambiente em execução local.
- O arquivo `.env.example` documenta nomes esperados, mas `.env` reais permanecem ignorados pelo monorepo.
- Os exemplos não fazem chamadas quando testes são executados.

## Fontes oficiais

- [API Center — Integra Contador](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/)
- [Central de Ajuda SERPRO — Informação Técnica](https://centraldeajuda.serpro.gov.br/duvidas/pt/documentacoes/informacoesdocumentacoes/)
