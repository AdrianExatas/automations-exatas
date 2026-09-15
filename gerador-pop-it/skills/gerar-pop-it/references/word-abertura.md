# Contrato de abertura Word (PR/IN)

Documento normativo para as tabelas de abertura do POP/PR e da IT/IN. Sempre que `pop` ou `it` estiverem em `documentos_solicitados`, o agente e o build devem cumprir este contrato.

Âncora: `referencias/01 PR.FIS.001 - Recálculo Guia Dpt. Fiscal.docx`.  
Templates: `assets/templates/PR-template.docx` e `assets/templates/IN-template.docx`.  
Geração: `scripts/build_word_documents.ps1` (`Set-OpeningTables`).

## Tabelas de abertura (1–4)

| # | Conteúdo | Fonte JSON |
|---|----------|------------|
| 1 | Título do documento | `documento.titulo` |
| 2 | Objetivo | `documento.objetivo` |
| 3 | Abreviaturas adotadas e definições | `abreviaturas[]` |
| 4 | Documentação complementar afiliada | pacote + `documentacao_complementar[]` |

## Abreviaturas (tabela 3)

- Cada item de `abreviaturas[]` vira **uma linha** de texto real (ex.: `NFS-e: Nota Fiscal de Serviços eletrônica`).
- **Nunca** aparecer o literal `System.String[]` (ou outro tipo .NET) na célula.
- No PowerShell, montar o texto com `Join-DisplayLines -Value ...` (parâmetro nomeado) e concatenar só **strings**. Concatenar `string + array` no PowerShell vira `System.String[]`.

## Documentação complementar (tabela 4)

Formato institucional (âncora PR.FIS.001):

```
CODIGO - Titulo;
```

- Ordem fixa do pacote: PR, IN, FORM, MP.
- **Excluir o documento atual** (no PR não listar `codigo_pop`; na IN não listar `codigo_it`).
- Helper obrigatório: `Get-ComplementaryDocumentationLines` em `build_word_documents.ps1`.
- Se `documentacao_complementar[]` já trouxer linhas `CODIGO - Titulo`, reutilizar o título por código; senão, usar `documento.titulo`.
- Preferir no JSON entradas já no formato `CODIGO - Titulo;` para lista mestra e consistência.

## JSON (quando pop/it na seleção)

- `abreviaturas`: array de strings (nunca um único blob tipado como array serializado).
- `documentacao_complementar`: array de strings; idealmente `PR.… - …;`, `IN.… - …;`, etc.
- `documento.codigo_pop` / `codigo_it` / `codigo_form` / `codigo_mp` e `documentos_solicitados` preenchidos para o helper derivar o pacote.

## Revisão humana

Ao abrir o PR/IN no Word:

1. Abreviaturas: lista legível, sem `System.String[]`.
2. Complementar: linhas `CODIGO - Titulo;`, sem o próprio documento, alinhadas aos arquivos gerados do pacote.
