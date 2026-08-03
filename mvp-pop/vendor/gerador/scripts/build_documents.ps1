param(
  [Parameter(Mandatory=$true)][string]$ContentJson,
  [Parameter(Mandatory=$true)][string]$OutputDir
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
  $transcriptionStatus = [string](Get-PropertyValue $Content.transcricao 'status' 'nao_executada')
  if ($transcriptionStatus -notin @('concluida', 'fornecida')) {
    $item = 'Ponto para validação: revisar informações faladas que não puderam ser transcritas com segurança.'
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
if (@($types | Where-Object { $_ -in @('form', 'mp') }).Count -gt 0) { Test-OfficeCom 'Excel.Application' 'Microsoft Excel' }

$staging = Join-Path ([System.IO.Path]::GetTempPath()) ('gerar-pop-it-' + [guid]::NewGuid().ToString('N'))
[System.IO.Directory]::CreateDirectory($staging) | Out-Null
$normalizedPath = Join-Path $staging 'content.normalized.json'

try {
  $normalizedJson = $content | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($normalizedPath, $normalizedJson, (New-Object System.Text.UTF8Encoding($true)))

  $wordTypes = @($types | Where-Object { $_ -in @('pop', 'it') })
  if ($wordTypes.Count -gt 0) {
    $wordScript = Join-Path $PSScriptRoot 'build_word_documents.ps1'
    if (-not (Test-Path -LiteralPath $wordScript)) { throw "Gerador Word não encontrado: $wordScript" }
    & $wordScript -ContentJson $normalizedPath -OutputDir $staging -DocumentTypes $wordTypes
  }

  $excelTypes = @($types | Where-Object { $_ -in @('form', 'mp') })
  if ($excelTypes.Count -gt 0) {
    $excelScript = Join-Path $PSScriptRoot 'build_excel_documents.ps1'
    if (-not (Test-Path -LiteralPath $excelScript)) { throw "Gerador Excel não encontrado: $excelScript" }
    & $excelScript -ContentJson $normalizedPath -OutputDir $staging -DocumentTypes $excelTypes
  }

  Write-PendingReport $content (Join-Path $staging 'pendencias-validacao.md')
  $validator = Join-Path $PSScriptRoot 'validate_documents.ps1'
  # Execute the validator in an isolated PowerShell process because it exposes
  # a command-line exit code.  Calling it in-process would let `exit` terminate
  # this orchestrator before the validated files are promoted.
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
  $deliverables = New-Object System.Collections.Generic.List[string]
  foreach ($type in $types) {
    switch ($type) {
      'pop' { $deliverables.Add([string]$content.saida.arquivo_pop) }
      'it' { $deliverables.Add([string]$content.saida.arquivo_it) }
      'form' { $deliverables.Add([string]$content.saida.arquivo_form) }
      'mp' { $deliverables.Add([string]$content.saida.arquivo_mp) }
    }
  }
  $deliverables.Add('relatorio-validacao.md')
  if (Test-Path -LiteralPath (Join-Path $staging 'pendencias-validacao.md')) { $deliverables.Add('pendencias-validacao.md') }
  foreach ($fileName in $deliverables) {
    Assert-SafeLeafName $fileName ([System.IO.Path]::GetExtension($fileName)) | Out-Null
    $source = Join-Path $staging $fileName
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Saída esperada não encontrada: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $targetPath $fileName) -Force
  }
  Write-Output "Documentos gerados em $targetPath"
} finally {
  if (Test-Path -LiteralPath $staging) {
    $resolvedStaging = [System.IO.Path]::GetFullPath($staging)
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedStaging.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        ([System.IO.Path]::GetFileName($resolvedStaging) -like 'gerar-pop-it-*')) {
      try {
        [System.IO.Directory]::Delete($resolvedStaging, $true)
      } catch {
        # Excel/Word às vezes mantêm lock breve no staging; não falha a geração.
        Start-Sleep -Seconds 2
        try { [System.IO.Directory]::Delete($resolvedStaging, $true) } catch { }
      }
    }
  }
}
