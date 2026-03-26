# @exatas/onvio-auth

Biblioteca interna para login no Onvio, persistencia de sessao e captura de `UDSLongToken` e `JWT_GESTTA`.

## API publica

- `loginOnvio(options)`
- `captureOnvioAndGesttaTokens(options)`
- `loadWorkspaceAuthArtifacts(startDir?, filePath?)`

## CLI

```bash
bun install
bun run --cwd shared/onvio-auth capture-tokens
```

Saida padrao:

- `runtime/latest-auth.json`
- `runtime/storageState.json`
