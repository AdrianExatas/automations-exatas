# @exatas/onvio-upload

Biblioteca interna para upload de tickets e anexos no Onvio.

## API publica

- `uploadTicketWithAttachments(options)`
- `uploadOnvioBatch(options)`
- `loadEmpresasFromExcel(excelPath)`

## Camadas

- `core`: cria ticket, adiciona topico e envia anexos
- `adapter Unecont`: resolve planilha, anexos e fallbacks de IDs via API do BD

## Desenvolvimento

```bash
bun install
bun run --cwd shared/onvio-upload build
bun run --cwd shared/onvio-upload test
```
