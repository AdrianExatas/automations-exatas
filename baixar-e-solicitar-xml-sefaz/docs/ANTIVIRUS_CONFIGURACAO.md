# Antivirus e bloqueios locais

Se o antivirus bloquear a automacao, normalmente o problema esta no volume de downloads, extracoes ou uploads.

## Excecoes recomendadas

Adicione excecao para:

- pasta da automacao
- `~/Downloads/XML SEFAZ`
- executavel do Python

## Mitigacoes rapidas

Rode em modo visivel:

```bash
python scripts/executar_download.py --upload --visible
```

Desabilite upload automatico e envie manualmente depois:

```bash
python scripts/executar_download.py
python scripts/executar_upload.py --auto
```

Reduza a pressao de upload no `.env`:

```env
UPLOAD_NUM_WORKERS=1
UPLOAD_DELAY_SECONDS=0.5
```

## Verificacao

- confirme que o processo nao foi interrompido pelo antivirus
- valide se os XMLs continuam aparecendo em `~/Downloads/XML SEFAZ`
- confira o estado local em `_local/checkpoints/` e `_local/logs/`
