# MCP Gestta + Onvio

Servidor MCP local por `stdio` para Gestta Processos, Onvio Gestão e Portal do Cliente. O servidor usa APIs verificadas como transporte principal, reaproveita os pacotes compartilhados de autenticação e solicitações de serviço e bloqueia de forma segura tudo que ainda não possui contrato versionado.

O catálogo é a fonte de verdade. Cada funcionalidade fica em um dos estados `verified`, `unavailable`, `policy_blocked` ou `drifted`; o MCP nunca inventa uma rota nem oferece proxy HTTP arbitrário.

## Requisitos e build

- Node.js 22 ou superior.
- Uma sessão criada por `@exatas/onvio-auth`, ou os dois tokens fornecidos por variável de ambiente.
- Playwright/Chromium somente para renovação e inventário autenticado.

Na raiz do monorepo:

```powershell
bun install
bun run --cwd Onvio/gestta-tarefas/mcp-gestta-onvio build
bun run --cwd Onvio/gestta-tarefas/mcp-gestta-onvio test
bun run --cwd Onvio/gestta-tarefas/mcp-gestta-onvio test:inspector
```

Para instalar o navegador quando necessário:

```powershell
npx playwright install chromium
```

Copie `.env.example` para a configuração privada do host. Não grave tokens ou senhas em arquivos versionados.

## Autenticação

Por padrão, o servidor procura o artefato `shared/onvio-auth/runtime/latest-auth.json` resolvido pelo pacote compartilhado. Também é possível indicar `ONVIO_AUTH_ARTIFACT_PATH` ou usar `GESTTA_JWT_TOKEN` junto com `ONVIO_UDS_LONG_TOKEN`.

Para renovar a sessão, configure `ONVIO_EMAIL` e `ONVIO_PASSWORD` no ambiente do processo e chame `gestta_onvio_auth_refresh`. MFA pode ser fornecido por `ONVIO_MFA_METHOD` e `ONVIO_MFA_CODE`. Nenhuma dessas credenciais aparece em respostas, logs ou erros MCP.

O servidor inicia sem sessão para permitir `gestta_onvio_auth_status` e `gestta_onvio_auth_refresh`. As demais capacidades ficam indisponíveis até permissões e licenças serem verificadas.

## Configuração no Codex

Depois do build, adicione ao arquivo de configuração do Codex:

```toml
[mcp_servers.gestta-onvio]
command = "node"
args = ["C:\\caminho\\automations-exatas\\Onvio\\gestta-tarefas\\mcp-gestta-onvio\\dist\\index.js"]
startup_timeout_sec = 30

[mcp_servers.gestta-onvio.env]
ONVIO_AUTH_ARTIFACT_PATH = "C:\\caminho\\automations-exatas\\shared\\onvio-auth\\runtime\\latest-auth.json"
MCP_ALLOWED_ROOTS = "C:\\dados\\entrada"
MCP_OUTPUT_DIR = "C:\\dados\\saida-mcp"
```

Outros hosts `stdio` podem usar [mcp-config.example.json](./mcp-config.example.json). O processo escreve somente mensagens MCP em `stdout`; diagnósticos ficam em `stderr`.

Para inspeção interativa, execute `bun run inspector` e use o MCP Inspector local.

## Interface

Ferramentas:

- `gestta_onvio_auth_status` e `gestta_onvio_auth_refresh`.
- `gestta_onvio_capabilities` para descobrir a cobertura efetiva da conta.
- `gestta_onvio_query` para leituras cadastradas. Use `unified.customer.resolve` para resolver `CustomerRef` por CNPJ, código ou ID.
- `gestta_onvio_prepare`, `gestta_onvio_commit` e `gestta_onvio_cancel` para escritas com confirmação.
- `gestta_onvio_job_status` para operações assíncronas cadastradas.

Recursos:

- `gestta-onvio://capabilities`
- `gestta-onvio://schemas/{operationId}`
- `gestta-onvio://jobs/{jobId}`
- `gestta-onvio://documents/{provider}/{containerId}/{documentId}`

Paginação usa cursores opacos vinculados à operação. O limite padrão é 50. Nunca reutilize um cursor em outro `operationId`.

## Escritas seguras

Uma escrita exige duas chamadas:

1. `gestta_onvio_prepare({ operationId, input, idempotencyKey? })` valida schema, permissões, licenças, versão do front-end e estado anterior. Nada é alterado.
2. Após revisar `before`, `after`, `warnings` e `summary`, chame `gestta_onvio_commit({ planId, confirmationToken })`.

O token dura 15 minutos por padrão, é vinculado ao hash do plano e tem uso único. O commit falha se o estado remoto, as permissões ou a versão mudarem. Mutações não idempotentes nunca são repetidas automaticamente.

## Arquivos e segredos

- Uploads só leem arquivos abaixo de `MCP_ALLOWED_ROOTS`; links simbólicos/reparse points são rejeitados.
- Downloads de até 20 MiB são retornados como recurso MCP. Acima disso, são gravados em `MCP_OUTPUT_DIR` sem sobrescrever arquivos existentes.
- Senhas, tokens, PFX, chaves privadas e conteúdo de certificados nunca são aceitos como payload operacional nem retornados. Manutenção futura de certificados usará apenas referências de ambiente/cofre.
- Auditoria redigida fica em `%LOCALAPPDATA%\Exatas\gestta-onvio-mcp\audit`, com retenção padrão de 30 dias.

## Inventário e drift

```powershell
bun run inventory
```

O inventário abre os três front-ends com a sessão compartilhada, registra navegação e requisições e aborta `POST`, `PUT`, `PATCH` e `DELETE` de negócio. Escritas Gestta são bloqueadas se as versões `core`/`admin` divergirem; escritas Onvio são bloqueadas quando contratos essenciais do import map mudam. Leituras compatíveis continuam funcionando.

Consulte [docs/catalog-maintenance.md](./docs/catalog-maintenance.md) antes de promover uma capacidade de `unavailable` para `verified`.

## Diagnóstico

- `auth_status` com `authenticated: false`: gere/renove o artefato ou configure ambos os tokens.
- Capacidade com `available: false`: veja `availabilityReason`; normalmente indica licença, permissão, autenticação ou drift.
- Escrita `drifted`: execute o inventário, recapture o contrato abortando a requisição real, atualize fixtures/testes e depois atualize a evidência.
- Upload rejeitado: confira `MCP_ALLOWED_ROOTS` e remova links/reparse points do caminho.

Messenger permanece `unavailable` enquanto não estiver contratado. Kolossus e Suporte Domínio estão classificados como `policy_blocked` e fora do escopo.
