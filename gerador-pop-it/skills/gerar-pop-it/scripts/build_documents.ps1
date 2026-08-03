param(
  [Parameter(Mandatory=$true)][string]$ContentJson,
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [string]$ListaMestraPath = '',
  [switch]$PreferOpenpyxl
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

function Test-OfficeCom {
  param([string]$ProgId, [string]$Label)
  if ($null -eq [type]::GetTypeFromProgID($ProgId)) { throw "$Label desktop não foi localizado." }
}

function Write-PendingReport {
  param($Content, [string]$Target)
  $pending = New-Object System.Collections.Generic.List[string]
  foreach ($item in (ConvertTo-StringArray $Content.pontos_validacao)) {
    if (-not $pending.Contains($item)) { $pending.Add($item) }
  }
  $transcriptionStatus = [string](Get-PropertyValue $Content.transcricao 'status' 'fornecida')
  if ($transcriptionStatus -notin @('concluida', 'fornecida')) {
    $item = 'Ponto para validação: revisar a transcrição fornecida; o texto não pôde ser usado com segurança.'
    if (-not $pending.Contains($item)) { $pending.Add($item) }
  }
  if ($pending.Count -eq 0) { return }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('# Pendências para validação')
  $lines.Add('')
  foreach ($item in $pending) { $lines.Add("- $item") }
  [System.IO.File]::WriteAllLines($Target, $lines.ToArray(), (New-Object System.Text.UTF8Encoding($true)))
}

$sourcePath = Get-FullPath $ContentJson
$targetPath = Get-FullPath $OutputDir
$content = Read-NormalizedContent $sourcePath
$types = @($content.documentos_solicitados)
if (@($types | Where-Object { $_ -in @('pop', 'it') }).Count -gt 0) { Test-OfficeCom 'Word.Application' 'Microsoft Word' }
if (@($types | Where-Object { $_ -in @('form', 'mp') }).Count -gt 0 -and -not $PreferOpenpyxl) {
  Test-OfficeCom 'Excel.Application' 'Microsoft Excel'
}

$staging = Join-Path ([System.IO.Path]::GetTempPath()) ('gerar-pop-it-' + [guid]::NewGuid().ToString('N'))
[System.IO.Directory]::CreateDirectory($staging) | Out-Null
$normalizedPath = Join-Path $staging 'content.normalized.json'

try {
  $normalizedJson = $content | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($normalizedPath, $normalizedJson, (New-Object System.Text.UTF8Encoding($true)))

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }

  # Gate semântico (conteúdo) antes de gerar Office.
  $qualityScript = Join-Path $PSScriptRoot 'validate_content_quality.py'
  $qualityReport = Join-Path $staging 'relatorio-qualidade.md'
  if ($null -ne $python -and (Test-Path -LiteralPath $qualityScript)) {
    & $python.Source @(
      $qualityScript,
      '--content-json', $normalizedPath,
      '--report-path', $qualityReport
    )
    if ($LASTEXITCODE -ne 0) { throw 'A validação semântica do conteúdo falhou. Veja relatorio-qualidade.md.' }
  } else {
    Write-Warning 'Python/validate_content_quality.py indisponível; gate semântico ignorado.'
  }

  $wordTypes = @($types | Where-Object { $_ -in @('pop', 'it') })
  if ($wordTypes.Count -gt 0) {
    $wordScript = Join-Path $PSScriptRoot 'build_word_documents.ps1'
    if (-not (Test-Path -LiteralPath $wordScript)) { throw "Gerador Word não encontrado: $wordScript" }
    & $wordScript -ContentJson $normalizedPath -OutputDir $staging -DocumentTypes $wordTypes

    # Corrige mojibake residual do Word COM (UTF-8 interpretado como Latin-1).
    $repairScript = Join-Path $PSScriptRoot 'repair_docx_encoding.py'
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
    if ($null -ne $python -and (Test-Path -LiteralPath $repairScript)) {
      $docxFiles = @(Get-ChildItem -LiteralPath $staging -Filter '*.docx' -File -ErrorAction SilentlyContinue)
      if ($docxFiles.Count -gt 0) {
        & $python.Source (@($repairScript) + @($docxFiles | ForEach-Object { $_.FullName }))
      }
    }
  }

  $excelTypes = @($types | Where-Object { $_ -in @('form', 'mp') })
  if ($excelTypes.Count -gt 0) {
    $excelScript = Join-Path $PSScriptRoot 'build_excel_documents.ps1'
    $excelFallback = Join-Path $PSScriptRoot 'build_excel_openpyxl.py'
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $python) { $python = Get-Command py -ErrorAction SilentlyContinue }

    function Invoke-OpenpyxlExcelBuild {
      if ($null -eq $python -or -not (Test-Path -LiteralPath $excelFallback)) {
        throw "Gerador Excel openpyxl indisponível: $excelFallback"
      }
      & $python.Source @(
        $excelFallback,
        '--content-json', $normalizedPath,
        '--output-dir', $staging,
        '--document-types', ($excelTypes -join ',')
      )
      if ($LASTEXITCODE -ne 0) { throw "Geração Excel via openpyxl falhou." }
    }

    if ($PreferOpenpyxl) {
      Write-Output 'Gerando FORM/MP via openpyxl (sem abrir Excel).'
      Invoke-OpenpyxlExcelBuild
    } else {
      if (-not (Test-Path -LiteralPath $excelScript)) { throw "Gerador Excel não encontrado: $excelScript" }
      try {
        & $excelScript -ContentJson $normalizedPath -OutputDir $staging -DocumentTypes $excelTypes
      } catch {
        Write-Warning ("Geração Excel via COM falhou; usando openpyxl. Detalhe: " + $_.Exception.Message)
        Invoke-OpenpyxlExcelBuild
      }
    }
  }

  Write-PendingReport $content (Join-Path $staging 'pendencias-validacao.md')

  # Validação estrutural (ZIP/XML via Python): não depende de Word/Excel COM.
  $validator = Join-Path $PSScriptRoot 'validate_documents_structural.ps1'
  $validatorArguments = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $validator,
    '-ContentJson', $normalizedPath,
    '-OutputDir', $staging,
    '-DocumentTypes', ($types -join ',')
  ) + @(
    '-ReportPath', (Join-Path $staging 'relatorio-validacao.md')
  )
  & powershell.exe @validatorArguments
  if ($LASTEXITCODE -ne 0) { throw 'A validação dos documentos falhou.' }

  if (-not (Test-Path -LiteralPath $targetPath)) { [System.IO.Directory]::CreateDirectory($targetPath) | Out-Null }
  $docsDir = Join-Path $targetPath 'documentos'
  $geracaoDir = Join-Path $targetPath 'geracao'
  [System.IO.Directory]::CreateDirectory($docsDir) | Out-Null
  [System.IO.Directory]::CreateDirectory($geracaoDir) | Out-Null

  # Entregáveis finais (Word/Excel).
  $documentFiles = New-Object System.Collections.Generic.List[string]
  foreach ($type in $types) {
    switch ($type) {
      'pop' { $documentFiles.Add([string]$content.saida.arquivo_pop) }
      'it' { $documentFiles.Add([string]$content.saida.arquivo_it) }
      'form' { $documentFiles.Add([string]$content.saida.arquivo_form) }
      'mp' { $documentFiles.Add([string]$content.saida.arquivo_mp) }
    }
  }
  foreach ($fileName in $documentFiles) {
    Assert-SafeLeafName $fileName ([System.IO.Path]::GetExtension($fileName)) | Out-Null
    $source = Join-Path $staging $fileName
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Saída esperada não encontrada: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $docsDir $fileName) -Force
  }

  # Lista Documental Mestra (FORM.QUA.003) — upsert por código.
  $listaScript = Join-Path $PSScriptRoot 'update_lista_mestra.py'
  if ($null -ne $python -and (Test-Path -LiteralPath $listaScript)) {
    $listaArgs = @(
      $listaScript,
      '--content-json', $normalizedPath,
      '--output-dir', $targetPath,
      '--entries-json', (Join-Path $geracaoDir 'lista-mestra-entradas.json')
    )
    if (-not [string]::IsNullOrWhiteSpace($ListaMestraPath)) {
      $listaArgs += @('--lista-mestra-path', (Get-FullPath $ListaMestraPath))
    }
    & $python.Source $listaArgs
    if ($LASTEXITCODE -ne 0) { throw 'A atualização da Lista Documental Mestra falhou.' }
  } else {
    Write-Warning 'Python/update_lista_mestra.py indisponível; lista mestra não foi gerada.'
  }

  # Artefatos de geração (JSON de conteúdo, relatório e pendências).
  Copy-Item -LiteralPath $normalizedPath -Destination (Join-Path $geracaoDir 'content.normalized.json') -Force
  $sourceLeaf = [System.IO.Path]::GetFileName($sourcePath)
  Assert-SafeLeafName $sourceLeaf '.json' | Out-Null
  $sourceDest = Join-Path $geracaoDir $sourceLeaf
  $sameSourceDest = (
    [System.IO.Path]::GetFullPath($sourcePath).Equals(
      [System.IO.Path]::GetFullPath($sourceDest),
      [System.StringComparison]::OrdinalIgnoreCase
    )
  )
  if ($sourceLeaf -ieq 'content.normalized.json' -or $sameSourceDest) {
    # Já está no destino (normalizado ou content-v2 na própria pasta geracao/).
  } else {
    Copy-Item -LiteralPath $sourcePath -Destination $sourceDest -Force
  }

  $artifactFiles = New-Object System.Collections.Generic.List[string]
  $artifactFiles.Add('relatorio-validacao.md')
  if (Test-Path -LiteralPath (Join-Path $staging 'relatorio-qualidade.md')) {
    $artifactFiles.Add('relatorio-qualidade.md')
  }
  if (Test-Path -LiteralPath (Join-Path $staging 'pendencias-validacao.md')) {
    $artifactFiles.Add('pendencias-validacao.md')
  }
  foreach ($fileName in $artifactFiles) {
    Assert-SafeLeafName $fileName ([System.IO.Path]::GetExtension($fileName)) | Out-Null
    $source = Join-Path $staging $fileName
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Saída esperada não encontrada: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $geracaoDir $fileName) -Force
  }

  Write-Output "Documentos finais em $docsDir"
  Write-Output "Artefatos de geracao em $geracaoDir"
} finally {
  if (Test-Path -LiteralPath $staging) {
    $resolvedStaging = [System.IO.Path]::GetFullPath($staging)
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedStaging.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        ([System.IO.Path]::GetFileName($resolvedStaging) -like 'gerar-pop-it-*')) {
      try {
        [System.IO.Directory]::Delete($resolvedStaging, $true)
      } catch {
        Start-Sleep -Seconds 2
        Get-Process EXCEL,WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        try {
          [System.IO.Directory]::Delete($resolvedStaging, $true)
        } catch {
          Write-Warning ("Nao foi possivel limpar o staging temporario: " + $resolvedStaging)
        }
      }
    }
  }
}
