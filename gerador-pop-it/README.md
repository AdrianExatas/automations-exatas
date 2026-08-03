# Gerador POP, IT, FORM e MP

Gera documentos editáveis de processos (POP/PR, IT/IN, FORM e MP) a partir de uma **transcrição** fornecida, seguindo o padrão documental da Exatas e os modelos locais da skill.

## Fluxo

1. Receber a transcrição do processo (texto no chat ou arquivo `.txt`/`.md`).
2. Montar o JSON v2 conforme o padrão documental.
3. Gerar os arquivos com `build_documents.ps1` (Microsoft Word e Excel).

## Estrutura

```
.gitignore
GUIA-RAPIDO.md
README.md
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

## Uso

Entregue a transcrição e peça a documentação. Detalhes, prints manuais e geração via script estão em [GUIA-RAPIDO.md](GUIA-RAPIDO.md).

A skill opera em [skills/gerar-pop-it/SKILL.md](skills/gerar-pop-it/SKILL.md). O contrato e as regras de conteúdo ficam em `skills/gerar-pop-it/references/`.

## Testes e validação

Gate semântico do conteúdo e Lista Documental Mestra estão documentados em [GUIA-RAPIDO.md](GUIA-RAPIDO.md). A rubrica operacional fica em `skills/gerar-pop-it/references/rubrica-qualidade.md`.

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
