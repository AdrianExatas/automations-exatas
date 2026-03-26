# @exatas/onvio-solicitacoes-servico

Biblioteca compartilhada para abrir solicitacoes de servico no Onvio a partir de planilha, com ou sem anexos.

## API publica

- `openServiceRequest(options)`
- `sendServiceRequestsBatch(options)`
- `loadServiceRequestsFromExcel(excelPath)`

Aliases legados ainda disponiveis:

- `openTicket(options)`
- `uploadTicketWithAttachments(options)`
- `uploadOnvioBatch(options)`
- `loadEmpresasFromExcel(excelPath)`

## CLI standalone

```bash
bun run --cwd shared/onvio-solicitacoes-servico send -- --excel C:/tmp/empresas.xlsx --mode no-attachments --dry-run
```

```bash
bun run --cwd shared/onvio-solicitacoes-servico send -- --excel C:/tmp/empresas.xlsx --attachments-dir C:/tmp/anexos --mode attachments --attachment-strategy explicit --token %ONVIO_UDS_TOKEN%
```

Opcoes principais:

- `--excel <arquivo>`
- `--attachments-dir <pasta>`
- `--mode attachments|no-attachments`
- `--attachment-strategy explicit|code-fallback`
- `--dry-run`
- `--bd-api-base-url <url>`
- `--default-client-id <id>`
- `--default-department-id <id>`
- `--default-requester-id <id>`

## Resolucao de IDs

Prioridade:

1. `ONVIO_CLIENT_ID`, `ONVIO_DEPARTMENT_ID`, `ONVIO_REQUESTER_ID` na planilha
2. defaults passados pela CLI ou API
3. provider opcional de IDs, como a BD API

O pacote generico nao consulta a BD API por padrao.

## Anexos

- `explicit`: usa apenas a coluna `ARQUIVOS`
- `code-fallback`: quando `ARQUIVOS` estiver vazio, tenta localizar anexos pelo `CODIGO`

## Desenvolvimento

```bash
bun install
bun run --cwd shared/onvio-solicitacoes-servico build
bun run --cwd shared/onvio-solicitacoes-servico test
```
