# Captura automática de prints (arquivado)

**Status:** arquivado — **não usar** no fluxo atual do gerador POP/IT.

A qualidade dos prints guiados por heurística de cursor / OCR + transcrição
não ficou adequada para produção. O código permanece no repositório para
retomada futura; a IT continua com **inserção manual** de prints.

## O que existe

| Artefato | Caminho |
|----------|---------|
| Extrator Python | `skills/gerar-pop-it/scripts/extract_click_frames.py` |
| Wrapper PowerShell | `skills/gerar-pop-it/scripts/extract_click_frames.ps1` |
| Dependências | `skills/gerar-pop-it/scripts/requirements-prints.txt` |
| Marcador de clique | `referencias/click_circle.png` |
| Sidecar de tempos (Whisper) | `transcriptions/**/*.segments.json` (gerado por `transcribe_media.py`) |
| Saídas de teste | `output/prints/` |

## Reativar no futuro

Use Python **3.10–3.12** (RapidOCR não publica wheel para 3.13+):

```powershell
pip install -r ".\skills\gerar-pop-it\scripts\requirements-prints.txt"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\extract_click_frames.ps1" `
  -VideoPath ".\videos\processo.mkv" `
  -TranscriptPath ".\transcriptions\a fazer\processo (transcribed on ...).txt" `
  -OutputDir ".\output\prints\processo"
```

O `.txt` precisa do sidecar `{stem}.segments.json` ao lado (gerado ao
retranscrever com `transcribe_media.ps1 -Force`).
