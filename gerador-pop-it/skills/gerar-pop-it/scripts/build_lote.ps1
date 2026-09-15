<#
.SYNOPSIS
  Gera documentos em lote a partir de pastas de processo ou lista de JSONs.

.DESCRIPTION
  Para cada item, chama build_documents.ps1 (openpyxl + gate de fidelidade FORM/MP).
  Nao usa Excel COM. Agrega lote-relatorio.md no OutputRoot (ou InputRoot).

.PARAMETER InputRoot
  Pasta com subpastas de processo; cada uma deve ter geracao/content-v2.json
  ou geracao/content.normalized.json. Aceita tambem hierarquia data/slug
  (ex.: output/2026-08-14/processo).

.PARAMETER ContentJson
  Um ou mais caminhos de JSON de conteudo (alternativa a InputRoot).

.PARAMETER OutputRoot
  Raiz onde gravar cada processo. Padrao: InputRoot, ou a pasta do processo do JSON.

.PARAMETER DocumentTypes
  Opcional. Sobrepoe documentos_solicitados nesta execucao (ex.: form,mp).
#>
param(
  [string]$InputRoot = '',
  [string[]]$ContentJson = @(),
  [string]$OutputRoot = '',
  [string[]]$DocumentTypes = @(),
  [switch]$UpdateListaMestra,
  [switch]$SkipMpFidelity,
  [switch]$SkipFormFidelity
)

$ErrorActionPreference = 'Stop'
$buildScript = Join-Path $PSScriptRoot 'build_documents.ps1'
if (-not (Test-Path -LiteralPath $buildScript)) {
  throw "build_documents.ps1 nao encontrado: $buildScript"
}

function Resolve-ProcessContentJson {
  param([string]$ProcessDir)
  $candidates = @(
    (Join-Path $ProcessDir 'geracao\content.normalized.json'),
    (Join-Path $ProcessDir 'geracao\content-v2.json'),
    (Join-Path $ProcessDir 'content.normalized.json'),
    (Join-Path $ProcessDir 'content-v2.json')
  )
  foreach ($path in $candidates) {
    if (Test-Path -LiteralPath $path -PathType Leaf) { return $path }
  }
  return $null
}

function Find-ProcessJobs {
  param(
    [string]$Root,
    [string]$OutBase
  )
  $found = New-Object System.Collections.Generic.List[object]
  $rootFull = [System.IO.Path]::GetFullPath($Root)
  # Filhos diretos (processo) e netos (data/slug).
  foreach ($level1 in Get-ChildItem -LiteralPath $rootFull -Directory -ErrorAction SilentlyContinue) {
    $json = Resolve-ProcessContentJson -ProcessDir $level1.FullName
    if ($null -ne $json) {
      $rel = $level1.Name
      $found.Add([pscustomobject]@{
          Slug = $rel
          ContentJson = $json
          OutputDir = Join-Path $OutBase $rel
        })
      continue
    }
    foreach ($level2 in Get-ChildItem -LiteralPath $level1.FullName -Directory -ErrorAction SilentlyContinue) {
      $json2 = Resolve-ProcessContentJson -ProcessDir $level2.FullName
      if ($null -eq $json2) { continue }
      $rel2 = Join-Path $level1.Name $level2.Name
      $found.Add([pscustomobject]@{
          Slug = $rel2
          ContentJson = $json2
          OutputDir = Join-Path $OutBase $rel2
        })
    }
  }
  foreach ($item in $found) {
    Write-Output $item
  }
}

$jobs = New-Object System.Collections.Generic.List[object]
$reportRoot = ''

if ($ContentJson.Count -gt 0) {
  foreach ($jsonPath in $ContentJson) {
    $full = [System.IO.Path]::GetFullPath($jsonPath)
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      throw "ContentJson nao encontrado: $full"
    }
    $slug = [System.IO.Path]::GetFileNameWithoutExtension($full)
    $parent = [System.IO.Path]::GetDirectoryName($full)
    if ([System.IO.Path]::GetFileName($parent) -ieq 'geracao') {
      $parent = [System.IO.Path]::GetDirectoryName($parent)
      $slug = [System.IO.Path]::GetFileName($parent)
      $grand = [System.IO.Path]::GetDirectoryName($parent)
      if (-not [string]::IsNullOrWhiteSpace($grand)) {
        $dateName = [System.IO.Path]::GetFileName($grand)
        if ($dateName -match '^\d{4}-\d{2}-\d{2}$') {
          $slug = Join-Path $dateName $slug
        }
      }
    }
    $outBase = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
      if ($slug -match '[\\/]') {
        [System.IO.Path]::GetDirectoryName($parent)
      } else {
        $parent
      }
    } else {
      [System.IO.Path]::GetFullPath($OutputRoot)
    }
    if ([string]::IsNullOrWhiteSpace($reportRoot)) {
      $reportRoot = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
        if ($slug -match '[\\/]') { [System.IO.Path]::GetDirectoryName($parent) } else { $parent }
      } else {
        [System.IO.Path]::GetFullPath($OutputRoot)
      }
    }
    $outputDir = if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $parent } else { Join-Path $outBase $slug }
    $jobs.Add([pscustomobject]@{
        Slug = $slug
        ContentJson = $full
        OutputDir = $outputDir
      })
  }
} elseif (-not [string]::IsNullOrWhiteSpace($InputRoot)) {
  $inputFull = [System.IO.Path]::GetFullPath($InputRoot)
  if (-not (Test-Path -LiteralPath $inputFull -PathType Container)) {
    throw "InputRoot nao encontrado: $inputFull"
  }
  $outBase = if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $inputFull } else { [System.IO.Path]::GetFullPath($OutputRoot) }
  $reportRoot = $outBase
  foreach ($job in @(Find-ProcessJobs -Root $inputFull -OutBase $outBase)) {
    if ($null -eq $job) { continue }
    if ($null -eq $job.PSObject.Properties['ContentJson']) { continue }
    $jobs.Add($job)
  }
} else {
  throw 'Informe -InputRoot ou -ContentJson.'
}

if ($jobs.Count -eq 0) {
  throw 'Nenhum processo com content-v2.json / content.normalized.json encontrado.'
}

[System.IO.Directory]::CreateDirectory($reportRoot) | Out-Null

$okCount = 0
$failCount = 0
$resultLines = New-Object System.Collections.Generic.List[string]

foreach ($job in $jobs) {
  Write-Output ("=== Lote: {0} ===" -f $job.Slug)
  $argsList = @(
    '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', $buildScript,
    '-ContentJson', $job.ContentJson,
    '-OutputDir', $job.OutputDir
  )
  if ($DocumentTypes.Count -gt 0) {
    $argsList += '-DocumentTypes'
    $argsList += ($DocumentTypes -join ',')
  }
  if ($UpdateListaMestra) { $argsList += '-UpdateListaMestra' }
  if ($SkipMpFidelity) { $argsList += '-SkipMpFidelity' }
  if ($SkipFormFidelity) { $argsList += '-SkipFormFidelity' }

  try {
    & powershell.exe @argsList
    if ($LASTEXITCODE -ne 0) {
      throw ("build_documents saiu com codigo {0}" -f $LASTEXITCODE)
    }
    $resultLines.Add(("- OK: {0} -> {1}" -f $job.Slug, $job.OutputDir))
    $okCount++
  } catch {
    $failCount++
    $msg = $_.Exception.Message
    $resultLines.Add(("- FALHA: {0} - {1}" -f $job.Slug, $msg))
    Write-Warning ("Falha em {0}: {1}" -f $job.Slug, $msg)
  }
}

$reportPath = Join-Path $reportRoot 'lote-relatorio.md'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# Relatorio de lote - gerar-pop-it')
$lines.Add('')
$lines.Add(("Processos: {0}" -f $jobs.Count))
$lines.Add(("Resumo: ok={0} falha={1}" -f $okCount, $failCount))
if ($DocumentTypes.Count -gt 0) {
  $lines.Add(("DocumentTypes: {0}" -f ($DocumentTypes -join ',')))
}
$lines.Add('')
foreach ($line in $resultLines) { $lines.Add($line) }
[System.IO.File]::WriteAllLines($reportPath, $lines.ToArray(), (New-Object System.Text.UTF8Encoding($true)))
Write-Output ("Relatorio: {0}" -f $reportPath)

if ($failCount -gt 0) {
  throw ("Lote concluido com falhas ({0}). Veja {1}" -f $failCount, $reportPath)
}
Write-Output ("Lote concluido com sucesso ({0} processos)." -f $okCount)
