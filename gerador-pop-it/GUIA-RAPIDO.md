# Guia rápido — Gerador de POP, IT, FORM e MP

## Requisitos

- Windows 64 bits.
- Cursor ou Codex com a skill `gerar-pop-it` disponível.
- Microsoft Word e Excel desktop instalados e licenciados.
- Para transcrição automática: Python 3.9+, ffmpeg no PATH e
  `pip install -r .\skills\gerar-pop-it\scripts\requirements-transcribe.txt`.
- Para pipeline completo sem colar no chat: variável `CURSOR_API_KEY` e
  `pip install cursor-sdk`.

## Estrutura do projeto

```
.gitignore
GUIA-RAPIDO.md
README.md
videos/                   # midia de entrada (gitignored)
transcriptions/           # transcricoes .txt (a fazer / feitos)
referencias/              # exemplos reais de PR/IN/FORM/MP para alinhar o padrão
skills/gerar-pop-it/      # skill, scripts, templates e contrato JSON
tests/                    # testes de contrato
```

A pasta `referencias/` serve só como referência de estilo e estrutura. Não é entrada do gerador: a entrada é a **transcrição** do processo (ou o vídeo/áudio que gera essa transcrição).

## Uso automatizado (recomendado)

Coloque o vídeo/áudio em `videos/` e rode:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\gerar_de_midia.ps1" `
  -MediaPath ".\videos\Aplicacao-advertencia.mp4" `
  -DocumentTypes pop,it,form,mp
```

O que acontece:

1. `transcribe_media.py` (faster-whisper / `large-v3-turbo`) grava o `.txt` em `transcriptions/a fazer/`.
2. Com `CURSOR_API_KEY`, o agente Cursor local monta `content-v2.json` e chama `build_documents.ps1`.
3. Sem a chave, a transcrição fica pronta e o script imprime o prompt para colar no chat.
4. Se os documentos forem gerados, o `.txt` é movido para `transcriptions/feitos/`.

Brief opcional (flags ou sidecar `videos/<nome>.json`): setor, códigos, responsáveis, sistema, prazo. O que faltar vira pendência — a skill não inventa regra.

Só STT (sem geração):

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\transcribe_media.ps1" `
  -MediaPath ".\videos" `
  -Watch
```

### Qualidade da transcrição (glossário Exatas)

O Whisper costuma errar siglas por som (`CEFAZ`/`SEFAZ`, `ECAQ`/`ECAC`). O STT usa por padrão o glossário em
`skills/gerar-pop-it/config/stt_glossary_exatas.json` (prompt + pós-correção). Edite esse JSON para incluir novos termos.

Refinar `.txt` já gerados **sem** reassistir o vídeo:

```powershell
# Só correções determinísticas do glossário
python ".\skills\gerar-pop-it\scripts\refine_transcript.py" `
  --input ".\transcriptions\a fazer\spa-*.txt" `
  --glossary-only --in-place

# + revisão por IA no texto (CURSOR_API_KEY + pip install cursor-sdk)
python ".\skills\gerar-pop-it\scripts\refine_transcript.py" `
  --input ".\transcriptions\a fazer\meu-processo.txt" `
  --llm --in-place
```

Retranscrever do zero com o glossário no Whisper: `transcribe_media.ps1 -Force` (ou `--force` no Python).
Desligar glossário: `-NoGlossary` / `--no-glossary`.

Já tem o `.txt`:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\gerar_de_midia.ps1" `
  -TranscriptionPath ".\transcriptions\a fazer\meu-processo.txt" `
  -DocumentTypes pop,it
```

A captura automática de prints a partir do vídeo está **arquivada** (não usar no fluxo atual). Detalhes em [archive/captura-prints/README.md](archive/captura-prints/README.md).

## Uso manual no chat

Entregue a transcrição do processo (ou o caminho do `.txt`) e solicite a documentação. Exemplo:

> Segue a transcrição do processo. Gere os documentos. Antes de começar, pergunte uma única vez se desejo POP/PR, IT/IN, FORM e/ou MP.

Informe também título, área, responsáveis, códigos ou prazos somente quando esses dados forem conhecidos. O gerador deve marcar como pendência tudo o que não puder ser confirmado; ele não deve inventar regras de negócio.

O fluxo é: receber a transcrição → montar o JSON conforme o padrão documental → gerar os arquivos com Word/Excel.

## Inserção manual dos prints

O gerador não captura nem anexa prints aos documentos. Na IT, cada etapa visual relevante recebe um campo de imagem 16:9 identificado e uma legenda com a tela esperada.

Para inserir o print no Word:

1. Clique no controle de imagem da etapa.
2. Escolha a imagem correta no computador.
3. Confirme que a tela corresponde à legenda e não expõe dados pessoais, credenciais ou informações de outro cliente.
4. Salve o documento e confira se o enquadramento permaneceu legível.

O FORM segue o modelo institucional (`FORM.QUA.002`), com observação e assinaturas no rodapé para registros manuais quando necessários.

## Geração direta via script

Com um JSON v2 já montado:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\build_documents.ps1" `
  -ContentJson ".\caminho\content-v2.json" `
  -OutputDir ".\output\nome-do-processo"
```

A saída fica organizada assim:

```
output/nome-do-processo/
  documentos/   # PR/IN/FORM/MP gerados
  geracao/      # JSON, relatório e pendências
```

## Verificação

Gate semântico do conteúdo (antes ou depois de montar o JSON):

```powershell
python ".\skills\gerar-pop-it\scripts\validate_content_quality.py" `
  --content-json ".\output\nome-do-processo\geracao\content-v2.json" `
  --report-path ".\output\nome-do-processo\geracao\relatorio-qualidade.md"
```

Validação estrutural dos documentos gerados (sem abrir Word/Excel):

```powershell
python ".\skills\gerar-pop-it\scripts\validate_documents_structural.py" `
  --content-json ".\output\nome-do-processo\geracao\content-v2.json" `
  --output-dir ".\output\nome-do-processo\documentos"
```

Fidelidade do MP (âncora MP.FIS.001). O `build_documents.ps1` já executa esse gate quando há MP; para checagem isolada:

```powershell
python ".\skills\gerar-pop-it\scripts\compare_mp_fidelity.py" `
  --generated ".\output\nome-do-processo\documentos\MP.*.xlsx" `
  --reference ".\referencias\01.3 MP.FIS.001 - Recálculo Guia Dpt. Fiscal.xlsx"
```

Geração em lote (várias pastas de processo com `geracao/content-v2.json` ou `content.normalized.json`):

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\build_lote.ps1" `
  -InputRoot ".\output\2026-09-02" `
  -OutputRoot ".\output\2026-09-02"
```

Contrato visual/estrutural do MP: `skills/gerar-pop-it/references/mp-fidelidade.md`.
Contrato visual/estrutural do FORM: `skills/gerar-pop-it/references/form-fidelidade.md`.
A Lista Documental Mestra (`FORM.QUA.003`) **não** é gerada por padrão. Só sob pedido explícito: `-UpdateListaMestra` (pacote em `documentos/`) ou `-ListaMestraPath` (cópia de trabalho; nunca sobrescrever `referencias/` sem cópia explícita). Use `-SkipListaMestra` para forçar a omissão.

Os testes de contrato (sem Office) podem ser executados assim:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\tests\run_contract_tests.ps1" -SkipOffice
```
