# Gerador POP, IT, FORM e MP

Gera documentos editáveis de processos (POP/PR, IT/IN, FORM e MP) a partir de uma **transcrição** (manual ou automática via Whisper local), seguindo o padrão documental da Exatas e os modelos locais da skill.

## Fluxo

1. Obter a transcrição do processo (texto no chat, `.txt`/`.md`, ou vídeo/áudio via STT local).
2. Montar o JSON v2 conforme o padrão documental.
3. Gerar os arquivos com `build_documents.ps1` (Microsoft Word e Excel).

## Pipeline automatizado

```powershell
# Dependencias do STT (uma vez)
pip install -r ".\skills\gerar-pop-it\scripts\requirements-transcribe.txt"
# ffmpeg precisa estar no PATH

# Video/audio -> transcricão -> (opcional) agente Cursor -> documentos
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\gerar_de_midia.ps1" `
  -MediaPath ".\videos\processo.mp4" `
  -DocumentTypes pop,it,form,mp
```

- STT: `faster-whisper` com modelo `large-v3-turbo` (`transcribe_media.py`).
- Glossário Exatas (`skills/gerar-pop-it/config/stt_glossary_exatas.json`): viés lexical no Whisper + pós-correção (CEFAZ→SEFAZ, ECAQ→ECAC, etc.).
- Refinar `.txt` já gerados: `python .\skills\gerar-pop-it\scripts\refine_transcript.py --input ".\transcriptions\a fazer\spa-*.txt" --in-place`
- Com `--llm` (ou `CURSOR_API_KEY` definida): revisão adicional por IA **só no texto** (sem reassistir o vídeo).
- Sem `CURSOR_API_KEY`: a transcrição é gerada e o script imprime o prompt para colar no Cursor.
- Com `CURSOR_API_KEY` + `pip install cursor-sdk`: o agente local monta o JSON e chama o build.

Só transcrever:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\transcribe_media.ps1" `
  -MediaPath ".\videos\processo.mp4"
```

Refinar termos após o STT:

```powershell
python ".\skills\gerar-pop-it\scripts\refine_transcript.py" `
  --input ".\transcriptions\a fazer\arquivo.txt" `
  --glossary-only --in-place

# Com revisão por IA (requer CURSOR_API_KEY + cursor-sdk)
python ".\skills\gerar-pop-it\scripts\refine_transcript.py" `
  --input ".\transcriptions\a fazer\arquivo.txt" `
  --llm --in-place
```

Para retranscrever do zero com o glossário no Whisper: use `-Force` / `--force` no STT.

A captura automática de prints a partir do vídeo está arquivada — ver [archive/captura-prints/README.md](archive/captura-prints/README.md).

## Estrutura

```
.gitignore
GUIA-RAPIDO.md
README.md
videos/                   # midia de entrada (gitignored)
transcriptions/           # .txt gerados / manuais (a fazer, feitos)
output/<processo>/
  documentos/             # entregáveis finais (.docx / .xlsx)
  geracao/                # JSON, relatório e pendências da geração
referencias/              # exemplos reais de PR/IN/FORM/MP (não são entrada do gerador)
skills/gerar-pop-it/      # skill, scripts, templates e contrato JSON
tests/                    # testes de contrato
```

## Requisitos

- Windows 64 bits
- Cursor ou Codex com a skill `gerar-pop-it`
- Microsoft Word e Excel desktop instalados e licenciados
- Para STT automático: Python 3.9+, `faster-whisper`, ffmpeg no PATH
- Para geração sem colar no chat: `CURSOR_API_KEY` e `cursor-sdk`

## Uso manual

Entregue a transcrição e peça a documentação. Detalhes, prints manuais e geração via script estão em [GUIA-RAPIDO.md](GUIA-RAPIDO.md).

A skill opera em [skills/gerar-pop-it/SKILL.md](skills/gerar-pop-it/SKILL.md). O contrato e as regras de conteúdo ficam em `skills/gerar-pop-it/references/`.

## Testes e validação

Gate semântico do conteúdo e atualização opcional da Lista Documental Mestra estão documentados em [GUIA-RAPIDO.md](GUIA-RAPIDO.md). A rubrica operacional fica em `skills/gerar-pop-it/references/rubrica-qualidade.md`.

Validação estrutural dos documentos (ZIP/XML, sem abrir Word/Excel):

```powershell
python ".\skills\gerar-pop-it\scripts\validate_documents_structural.py" `
  --content-json ".\output\nome-do-processo\geracao\content-v2.json" `
  --output-dir ".\output\nome-do-processo\documentos"
```

Testes de contrato na raiz do projeto:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\tests\run_contract_tests.ps1" -SkipOffice
```

Para a suíte completa (requer Word e Excel), omita `-SkipOffice`. Veja [tests/README.md](tests/README.md).
