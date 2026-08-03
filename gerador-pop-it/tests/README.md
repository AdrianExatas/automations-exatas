# Testes do contrato v2

Os testes validam o contrato JSON, a normalização (incluindo entrada legada) e a geração dos documentos. Não há captura nem processamento de vídeo.

Execute na raiz do projeto, em Windows PowerShell 5.1:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\tests\run_contract_tests.ps1
```

A execução completa requer Word e Excel desktop. Ela cobre as seleções POP/IT,
FORM/MP, os quatro documentos e uma entrada legada POP/IT. Os artefatos são
criados em uma pasta temporária com espaços e acentos e removidos ao final.
A promoção esperada é `documentos/` (entregáveis) e `geracao/` (JSON/relatórios).

Para validar somente JSON, normalização e compatibilidade legada:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\tests\run_contract_tests.ps1 -SkipOffice
```

Use `-KeepArtifacts` apenas durante diagnósticos. O runner informa o caminho
temporário preservado no fim da execução.
