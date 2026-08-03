# Guia rápido — Gerador de POP, IT, FORM e MP

## Requisitos

- Windows 64 bits.
- Cursor ou Codex com a skill `gerar-pop-it` disponível.
- Microsoft Word e Excel desktop instalados e licenciados.

## Estrutura do projeto

```
.gitignore
GUIA-RAPIDO.md
README.md
referencias/              # exemplos reais de PR/IN/FORM/MP para alinhar o padrão
skills/gerar-pop-it/      # skill, scripts, templates e contrato JSON
tests/                    # testes de contrato
```

A pasta `referencias/` serve só como referência de estilo e estrutura. Não é entrada do gerador: a entrada é a **transcrição** do processo.

## Uso

Entregue a transcrição do processo e solicite a documentação. Exemplo:

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

O FORM traz uma área de evidência por bloco, também destinada à inclusão manual quando necessária.

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

A Lista Documental Mestra (`FORM.QUA.003`) é gerada/atualizada automaticamente em `documentos/` no fim do `build_documents.ps1`. Para mesclar em uma cópia de trabalho (nunca sobrescrever `referencias/` sem cópia explícita), passe `-ListaMestraPath`.

Os testes de contrato (sem Office) podem ser executados assim:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\tests\run_contract_tests.ps1" -SkipOffice
```
