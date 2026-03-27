# Agendamento da automacao SEFAZ

## Fluxo recomendado

Agende primeiro o download e depois a consulta:

1. `scripts/executar_download.py --upload`
2. `scripts/executar_consulta.py`

O download pega XMLs ja prontos. A consulta faz as novas solicitacoes para o proximo ciclo.

## Estado local

Os arquivos de runtime usados pelo agendamento ficam em:

- `_local/checkpoints/`
- `_local/checkpoints/backups/`
- `_local/logs/`
- `_local/lock/`

Os downloads continuam em `~/Downloads/XML SEFAZ`.

## Script PowerShell

O script `scripts/configurar_agendamento.ps1` continua sendo o entrypoint suportado para criar as tarefas no Windows.

Uso basico:

```powershell
.\scripts\configurar_agendamento.ps1
```

## Validacao manual

Antes de agendar, valide manualmente:

```bash
python scripts/executar_download.py --status
python scripts/executar_consulta.py --status
```

Depois rode um ciclo curto:

```bash
python scripts/executar_download.py --headless
python scripts/executar_consulta.py --headless
```

## Operacao

- use `.env` na raiz da automacao
- mantenha o Chrome instalado e atualizado
- use `--visible` para depuracao
- se houver conflito de execucao, limpe os locks em `_local/lock/` apenas quando tiver certeza de que nao ha outro processo ativo
