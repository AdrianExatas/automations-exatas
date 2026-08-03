# Arquitetura

```text
Host MCP
  -> ferramentas e recursos (stdio)
     -> catálogo + permissões/licenças + version guard
        -> query ----------------------> API Gestta/Onvio
        -> prepare -> plano temporário
        -> commit  -> revalidação -----> API Gestta/Onvio
        -> recurso de documento -------> memória (<=20 MiB) ou MCP_OUTPUT_DIR
     -> @exatas/onvio-auth
     -> @exatas/onvio-solicitacoes-servico
     -> Playwright estrito (somente fluxo versionado/UI-only)
```

## Componentes

- `catalog/definitions.ts`: inventário versionado, schemas, riscos, licenças e evidências.
- `catalog/catalog.ts`: disponibilidade efetiva para a conta e paginação opaca.
- `catalog/version-guard.ts`: bloqueio fail-closed de escrita em drift.
- `auth/auth-manager.ts`: artefato compartilhado, status e uma renovação em `401/403`.
- `http/api-client.ts`: autenticação por provedor, limite de concorrência, `Retry-After` e retry apenas seguro.
- `operations/executor.ts`: validação, interpolação de rotas e normalização.
- `operations/change-engine.ts`: plano, hash, token temporário, replay protection e revalidação.
- `resources/documents.ts`: download limitado e saída segura.
- `browser/fallback.ts`: registro explícito de flows e seletores; sem cliques heurísticos.

Planos e jobs são intencionalmente mantidos em memória. Reiniciar o servidor invalida confirmações pendentes, evitando replay entre sessões.

## Limites de confiança

O protocolo MCP recebe apenas dados de negócio redigidos e referências de arquivos. Tokens ficam no gerenciador de autenticação. O cliente HTTP é o único componente que monta cabeçalhos de autenticação. Não existe operação para informar URL, método ou cabeçalho arbitrários.
