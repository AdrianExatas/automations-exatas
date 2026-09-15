# Agendamento da automacao SEFAZ

## Fluxo recomendado

Agende primeiro o download e depois a consulta:

1. `bun run TS/src-ts/cli/download.ts --upload`
2. `bun run TS/src-ts/cli/consulta.ts`

O transporte padrao e `auto`: a automacao tenta HTTP autenticado primeiro e usa
Playwright somente quando o Portal Fazendario nao aceitar a navegacao HTTP. Para
diagnostico, use `--transport http` ou `--transport playwright`.

O download pega XMLs ja prontos. A consulta faz as novas solicitacoes para o proximo ciclo.

## Estado local

Os arquivos de runtime usados pelo agendamento ficam em:

- `_local/checkpoints/`
- `_local/checkpoints/backups/`
- `_local/logs/`
- `_local/lock/`

Os downloads continuam em `~/Downloads/XML SEFAZ`.

## Script PowerShell

O script `scripts/configurar_agendamento_ts.ps1` e o entrypoint suportado para criar ou atualizar as tarefas TS/Bun no Windows.

Uso basico:

```powershell
.\scripts\configurar_agendamento_ts.ps1
```

Ele recria os wrappers em `_local/scheduled`, registra as tarefas `SEFAZ_TS_Download_Upload_XML` e `SEFAZ_TS_Consulta_XML`, preserva logs em `_local/logs/scheduled` e mantem as tarefas Python antigas desabilitadas.

## Validacao manual

Antes de agendar, valide manualmente:

```bash
bun run TS/src-ts/cli/download.ts --status
bun run TS/src-ts/cli/consulta.ts --status
```

Depois rode um ciclo curto:

```bash
bun run TS/src-ts/cli/download.ts --headless
bun run TS/src-ts/cli/consulta.ts --headless
```

## Validacao controlada de uma solicitacao

Este comando envia exatamente uma solicitacao. Use-o antes de habilitar o ciclo
diario apos uma mudanca no Portal Fazendario:

```bash
bun run TS/src-ts/cli/solicitar.ts --inscricao 123 --tipo NFE --pesquisar-por Emitida --data-inicial 01/08/2026 --data-final 01/08/2026 --transport auto --visible
```

O fallback Playwright exige os navegadores instalados uma unica vez:

```bash
cd TS
bunx playwright install chromium
```

O certificado continua vindo de `SEFAZ_CERT_PFX_PATH` e
`SEFAZ_CERT_PFX_PASSWORD`; ele nao e copiado para o perfil temporario do
navegador nem gravado em logs.

## Operacao

- use `.env` na raiz da automacao
- mantenha o Chrome instalado e atualizado
- use `--visible` para depuracao
- se houver conflito de execucao, limpe os locks em `_local/lock/` apenas quando tiver certeza de que nao ha outro processo ativo

Apos atualizar o checkpoint de download, arquivos irmãos com a mesma
`dtSolicitacao` deixam de ser pulados. Se um checkpoint antigo (ate 7 dias)
ainda estiver ativo e parecer incompleto, rode do zero:

```bash
bun run TS/src-ts/cli/task.ts download-upload --from-zero
```

ou `bun run TS/src-ts/cli/download.ts --limpar` antes do proximo ciclo.
